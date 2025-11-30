const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateDiscountCode = (length = 6) => {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
};

export const generateSlug = (length = 10) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < length; i += 1) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
};

