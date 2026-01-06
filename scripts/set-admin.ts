/**
 * Script to set is_admin=true for a specific user by email
 * Usage: ts-node --project tsconfig.seed.json scripts/set-admin.ts [email]
 */

import { PrismaClient } from '@prisma/client';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    console.log(`Setting is_admin=true for user: ${email}`);

    // First, find the user in Supabase auth.users by email
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
    
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`);
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found in auth.users`);
    }

    console.log(`Found user in auth.users: ${user.id}`);

    // Update the profile in public.profiles using Prisma
    // Note: Prisma uses camelCase for field names, but database has snake_case
    // We need to use the mapped field name
    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: { is_admin: true },
    });

    console.log(`✓ Successfully set is_admin=true for user ${email}`);
    console.log(`  Profile ID: ${profile.id}`);
    console.log(`  Email: ${profile.email}`);
    console.log(`  is_admin: ${profile.is_admin}`);

    return profile;
  } catch (error) {
    console.error('Error setting admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line args or use default
const email = process.argv[2] || 'mikhail.bilak@studio.unibo.it';

setAdmin(email)
  .then(() => {
    console.log('\n✓ Admin setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Admin setup failed:', error);
    process.exit(1);
  });

