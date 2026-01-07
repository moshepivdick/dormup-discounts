type EnvVar =
  | 'DATABASE_URL'
  | 'DIRECT_URL'
  | 'PARTNER_JWT_SECRET'
  | 'ADMIN_JWT_SECRET'
  | 'ADMIN_PANEL_SLUG'
  | 'ADMIN_PANEL_PASSWORD_HASH'
  | 'ADMIN_GATE_COOKIE_TTL_MINUTES';

const getEnv = (key: EnvVar, fallback?: string) => {
  // Try multiple ways to get the value
  let value = process.env[key];
  
  // If not found, try without trimming first (in case key has spaces)
  if (!value) {
    // Try to find it in all env vars (case-insensitive, handle spaces)
    const envKey = key.trim();
    value = process.env[envKey];
  }
  
  // Try fallback
  if (!value && fallback) {
    value = fallback;
  }
  
  // Trim the value if it exists
  value = value?.trim();
  
  if (!value) {
    // Debug: log all env vars that start with ADMIN_PANEL
    const adminVars = Object.keys(process.env)
      .filter(k => k.includes('ADMIN_PANEL'))
      .map(k => `${k}=${process.env[k]?.substring(0, 20)}...`);
    console.error(`Missing required environment variable: ${key}`);
    console.error('Available ADMIN_PANEL vars:', adminVars);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value;
};

const getEnvOptional = (key: string, fallback?: string): string | undefined => {
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
    const raw = getEnvOptional('ADMIN_GATE_COOKIE_TTL_MINUTES') ?? '120';
    const ttl = Number(raw);
    return Number.isFinite(ttl) ? ttl : 120;
  },
};

