/**
 * Script to verify password hash
 * Usage: npx ts-node --project tsconfig.seed.json scripts/verify-password-hash.ts "password" "hash"
 */

import bcrypt from 'bcryptjs';

async function verifyPassword(password: string, hash: string) {
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('Hash length:', hash.length);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Is valid:', isValid);
  
  if (!isValid) {
    console.log('\nGenerating new hash for this password...');
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash);
  }
  
  return isValid;
}

const password = process.argv[2] || '#a*xuG@zDGC5&zA8cBy4';
const hash = process.argv[3] || '$2b$10$NfdPicSbC7ClH/TKi66q0urB/782vryBFjdeZVcBd1NT6hsRLfNNu';

verifyPassword(password, hash)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

