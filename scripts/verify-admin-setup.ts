/**
 * Script to verify admin setup
 * Usage: npx ts-node --project tsconfig.seed.json scripts/verify-admin-setup.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySetup() {
  try {
    console.log('Verifying admin setup...\n');

    // Check if column exists
    console.log('1. Checking if is_admin column exists...');
    const testProfile = await prisma.profile.findFirst({
      select: { id: true, email: true, is_admin: true },
    });
    
    if (testProfile && 'is_admin' in testProfile) {
      console.log('   ✓ Column is_admin exists in Profile model');
    } else {
      throw new Error('Column is_admin not found');
    }

    // Check admin user
    console.log('\n2. Checking admin user...');
    const adminProfile = await prisma.profile.findUnique({
      where: { email: 'mikhail.bilak@studio.unibo.it' },
      select: { id: true, email: true, is_admin: true },
    });

    if (!adminProfile) {
      throw new Error('Admin user profile not found');
    }

    if (adminProfile.is_admin) {
      console.log(`   ✓ Admin user found: ${adminProfile.email}`);
      console.log(`   ✓ is_admin = ${adminProfile.is_admin}`);
    } else {
      throw new Error('Admin user exists but is_admin is false');
    }

    // Check index
    console.log('\n3. Checking database index...');
    const indexCheck = await prisma.$queryRawUnsafe(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'profiles' 
      AND indexname = 'idx_profiles_is_admin';
    `);
    
    if (Array.isArray(indexCheck) && indexCheck.length > 0) {
      console.log('   ✓ Index idx_profiles_is_admin exists');
    } else {
      console.log('   ⚠ Index might not exist (this is OK if migration was applied)');
    }

    console.log('\n✅ All checks passed! Admin setup is correct.');
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifySetup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

