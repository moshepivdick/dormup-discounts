/**
 * Script to apply admin migration and set admin user
 * Usage: npx ts-node --project tsconfig.seed.json scripts/apply-admin-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Applying admin migration...');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Executing migration SQL...');
    
    // Step 1: Add column
    console.log('  → Adding is_admin column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;
    `);
    console.log('  ✓ Column added');

    // Step 2: Create index
    console.log('  → Creating index...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;
    `);
    console.log('  ✓ Index created');

    // Step 3: Drop existing policy
    console.log('  → Updating RLS policies...');
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    `);

    // Step 4: Create new policy - use a function to check is_admin hasn't changed
    // In RLS policies, we can't use OLD/NEW directly, so we use a different approach
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update their own profile"
        ON public.profiles
        FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (
          auth.uid() = id 
          AND (
            -- Allow update if is_admin is not being changed (stays false)
            -- This is enforced by checking that the new value matches the existing value
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = is_admin
            OR
            -- Or if user is trying to set is_admin to false (can't set to true)
            is_admin = false
          )
        );
    `);
    console.log('  ✓ RLS policy updated');

    // Step 5: Add comment
    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN public.profiles.is_admin IS 'Admin access flag. Only service_role can modify this field.';
    `);
    console.log('  ✓ Comment added');

    console.log('✓ Migration applied successfully');

    // Set admin for user
    console.log('\nSetting is_admin=true for user: mikhail.bilak@studio.unibo.it');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`);
    }

    const user = authUser.users.find(u => u.email === 'mikhail.bilak@studio.unibo.it');
    
    if (!user) {
      throw new Error('User with email mikhail.bilak@studio.unibo.it not found in auth.users');
    }

    console.log(`Found user in auth.users: ${user.id}`);

    // Update profile using Prisma
    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: { is_admin: true },
    });

    console.log(`✓ Successfully set is_admin=true for user mikhail.bilak@studio.unibo.it`);
    console.log(`  Profile ID: ${profile.id}`);
    console.log(`  Email: ${profile.email}`);
    console.log(`  is_admin: ${profile.is_admin}`);

    console.log('\n✅ All operations completed successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✓ Migration and admin setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Failed:', error);
    process.exit(1);
  });

