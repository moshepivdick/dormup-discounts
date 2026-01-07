import { PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Get the connection URL, preferring DIRECT_URL but falling back to DATABASE_URL
// Remove pgbouncer parameters from DATABASE_URL if using it as fallback
function getConnectionUrl(): string {
  try {
    const directUrl = env.directUrl();
    // Ensure DIRECT_URL uses port 5432 (direct connection)
    if (directUrl && !directUrl.includes(':6543')) {
      return directUrl;
    }
  } catch (error) {
    // DIRECT_URL not set, fall back to DATABASE_URL
  }

  // Fallback to DATABASE_URL, but remove pgbouncer parameters
  const databaseUrl = env.databaseUrl();
  if (databaseUrl) {
    // Remove pgbouncer=true and connection_limit parameters
    // Replace port 6543 with 5432 for direct connection
    let url = databaseUrl
      .replace(/pgbouncer=true[&]?/gi, '')
      .replace(/connection_limit=\d+[&]?/gi, '')
      .replace(/:6543\//, ':5432/')
      .replace(/[?&]$/, '')
      .replace(/\?$/, '');
    
    // Clean up any double & or trailing &
    url = url.replace(/&&+/g, '&').replace(/[?&]$/, '');
    
    return url;
  }

  throw new Error('Neither DIRECT_URL nor DATABASE_URL is set');
}

// Use direct connection (port 5432) for all operations
// This is more reliable with Prisma than the pooled connection
// In serverless environments, we need to ensure connection pooling is configured correctly
const connectionUrl = getConnectionUrl();

// Add connection_limit parameter to prevent too many connections
// For serverless, we want to limit concurrent connections per instance
const connectionUrlWithLimit = connectionUrl.includes('?')
  ? `${connectionUrl}&connection_limit=1`
  : `${connectionUrl}?connection_limit=1`;

export const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: connectionUrlWithLimit,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// In production (Vercel), we still use global.prisma to reuse connections within the same process
// This helps prevent creating too many Prisma Client instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
} else {
  // In production, also cache the Prisma Client instance
  // This prevents creating multiple instances in the same serverless function execution
  global.prisma = prisma;
}

