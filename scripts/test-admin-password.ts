/**
 * Script to test admin password verification
 * Usage: npx ts-node --project tsconfig.seed.json scripts/test-admin-password.ts "password"
 */

import bcrypt from 'bcryptjs';
import { env } from '../lib/env';

async function testPassword(password: string) {
  try {
    const hash = env.adminPanelPasswordHash();
    console.log('Testing password:', password);
    console.log('Hash from env:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    
    if (isValid) {
      console.log('✓ Password is VALID');
    } else {
      console.log('✗ Password is INVALID');
      console.log('\nGenerating new hash for this password...');
      const newHash = await bcrypt.hash(password, 10);
      console.log('New hash:', newHash);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

const password = process.argv[2] || '#a*xuG@zDGC5&zA8cBy4';

testPassword(password)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

