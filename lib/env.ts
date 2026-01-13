type EnvVar =
  | 'DATABASE_URL'
  | 'DIRECT_URL'
  | 'PARTNER_JWT_SECRET'
  | 'ADMIN_JWT_SECRET'
  | 'ADMIN_PANEL_SLUG'
  | 'ADMIN_PANEL_PASSWORD_HASH'
  | 'ADMIN_GATE_COOKIE_TTL_MINUTES'
  | 'EXPORT_HASH_SALT'
  | 'MAX_EXPORT_DAYS';

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
    // Debug: log all env vars that start with ADMIN_PANEL with full details
    const adminVars = Object.keys(process.env)
      .filter(k => k.includes('ADMIN_PANEL'))
      .map(k => {
        const val = process.env[k];
        return {
          key: k,
          valueLength: val?.length || 0,
          valuePrefix: val?.substring(0, 30) || 'EMPTY',
          valueSuffix: val && val.length > 30 ? val.substring(val.length - 10) : '',
          isEmpty: !val || val.trim().length === 0,
        };
      });
    console.error(`Missing required environment variable: ${key}`);
    console.error('Available ADMIN_PANEL vars details:', JSON.stringify(adminVars, null, 2));
    
    // Try to get the raw value without trim to see what's actually there
    const rawValue = process.env[key];
    console.error(`Raw value for ${key}:`, {
      exists: !!rawValue,
      length: rawValue?.length || 0,
      isEmpty: !rawValue || rawValue.trim().length === 0,
      firstChars: rawValue?.substring(0, 30),
      lastChars: rawValue && rawValue.length > 30 ? rawValue.substring(rawValue.length - 10) : '',
    });
    
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
  adminPanelPasswordHash: () => {
    // Try multiple ways to get the hash
    const rawHash = process.env.ADMIN_PANEL_PASSWORD_HASH;
    
    // Log for debugging
    console.log('Reading ADMIN_PANEL_PASSWORD_HASH:', {
      exists: !!rawHash,
      length: rawHash?.length || 0,
      isEmpty: !rawHash || rawHash.trim().length === 0,
      firstChars: rawHash?.substring(0, 20),
    });
    
    if (rawHash) {
      const trimmed = rawHash.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
      console.error('ADMIN_PANEL_PASSWORD_HASH exists but is empty after trim');
    }
    
    try {
      return getEnv('ADMIN_PANEL_PASSWORD_HASH');
    } catch (error) {
      console.error('Failed to get ADMIN_PANEL_PASSWORD_HASH via getEnv, trying direct access');
      // Last resort: try without trim
      if (rawHash && rawHash.length > 0) {
        return rawHash.trim();
      }
      throw error;
    }
  },
  adminGateCookieTtlMinutes: () => {
    const raw = getEnvOptional('ADMIN_GATE_COOKIE_TTL_MINUTES') ?? '120';
    const ttl = Number(raw);
    return Number.isFinite(ttl) ? ttl : 120;
  },
  exportHashSalt: () => getEnvOptional('EXPORT_HASH_SALT') ?? 'dormup-export-salt-2024',
  maxExportDays: () => {
    const raw = getEnvOptional('MAX_EXPORT_DAYS') ?? '31';
    const days = Number(raw);
    return Number.isFinite(days) && days > 0 ? days : 31;
  },
};

