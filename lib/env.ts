type EnvVar =
  | 'DATABASE_URL'
  | 'DIRECT_URL'
  | 'PARTNER_JWT_SECRET'
  | 'ADMIN_JWT_SECRET'
  | 'ADMIN_PANEL_SLUG'
  | 'ADMIN_PANEL_PASSWORD_HASH'
  | 'ADMIN_GATE_COOKIE_TTL_MINUTES';

const getEnv = (key: EnvVar, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvOptional = (key: string, fallback?: string) => {
  return process.env[key] ?? fallback;
};

export const env = {
  databaseUrl: () => getEnv('DATABASE_URL'),
  directUrl: () => getEnv('DIRECT_URL', process.env.DATABASE_URL),
  partnerSecret: () => getEnv('PARTNER_JWT_SECRET'),
  adminSecret: () => getEnv('ADMIN_JWT_SECRET'),
  adminPanelSlug: () => getEnv('ADMIN_PANEL_SLUG'),
  adminPanelPasswordHash: () => getEnv('ADMIN_PANEL_PASSWORD_HASH'),
  adminGateCookieTtlMinutes: () => {
    const ttl = getEnvOptional('ADMIN_GATE_COOKIE_TTL_MINUTES', '120');
    return parseInt(ttl, 10);
  },
};

