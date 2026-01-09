import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a cryptographically secure discount code
 * Uses crypto.randomBytes for secure random number generation
 */
export const generateDiscountCode = (length = 6) => {
  let code = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % ALPHABET.length;
    code += ALPHABET[index];
  }
  return code;
};

/**
 * Generates a cryptographically secure slug
 * Uses crypto.randomBytes for secure random number generation
 */
export const generateSlug = (length = 10) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % chars.length;
    slug += chars[index];
  }
  return slug;
};

