type EnvVar =
  | 'DATABASE_URL'
  | 'DIRECT_URL'
  | 'PARTNER_JWT_SECRET'
  | 'ADMIN_JWT_SECRET';

const getEnv = (key: EnvVar, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  databaseUrl: () => getEnv('DATABASE_URL'),
  directUrl: () => getEnv('DIRECT_URL', process.env.DATABASE_URL),
  partnerSecret: () => getEnv('PARTNER_JWT_SECRET'),
  adminSecret: () => getEnv('ADMIN_JWT_SECRET'),
};

