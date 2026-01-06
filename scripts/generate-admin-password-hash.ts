/**
 * Script to generate bcrypt hash for admin panel password
 * Usage: ts-node --project tsconfig.seed.json scripts/generate-admin-password-hash.ts <password>
 * 
 * Example:
 *   ts-node --project tsconfig.seed.json scripts/generate-admin-password-hash.ts "my-secure-password"
 * 
 * Output: bcrypt hash that should be set as ADMIN_PANEL_PASSWORD_HASH in .env
 */

import bcrypt from 'bcryptjs';

async function generateHash(password: string) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

const password = process.argv[2];

if (!password) {
  console.error('Usage: ts-node scripts/generate-admin-password-hash.ts <password>');
  console.error('');
  console.error('Example:');
  console.error('  ts-node scripts/generate-admin-password-hash.ts "my-secure-password"');
  process.exit(1);
}

generateHash(password)
  .then((hash) => {
    console.log('\n✓ Password hash generated:');
    console.log(hash);
    console.log('\nAdd this to your .env.local and Vercel environment variables:');
    console.log(`ADMIN_PANEL_PASSWORD_HASH="${hash}"`);
    console.log('\n⚠️  Keep the original password secure and do not commit it to the repository.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error generating hash:', error);
    process.exit(1);
  });

