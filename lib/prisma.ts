import { PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Get the connection URL
// For production (Vercel/serverless), use pooled connection (DATABASE_URL with pgbouncer)
// For development/migrations, prefer DIRECT_URL
function getConnectionUrl(): string {
  // In production, use pooled connection to avoid "max clients reached" errors
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  if (isProduction) {
    // Use DATABASE_URL with pgbouncer for pooled connections
    // This is essential for serverless to avoid connection limit errors
    const databaseUrl = env.databaseUrl();
    if (databaseUrl) {
      // Ensure pgbouncer mode is enabled
      let url = databaseUrl;
      if (!url.includes('pgbouncer=true')) {
        url = url.includes('?') ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
      }
      // Add connection pool settings
      if (!url.includes('connection_limit')) {
        url = url.includes('?') ? `${url}&connection_limit=10` : `${url}?connection_limit=10`;
      }
      if (!url.includes('pool_timeout')) {
        url = url.includes('?') ? `${url}&pool_timeout=10` : `${url}?pool_timeout=10`;
      }
      return url;
    }
  }

  // For development or if DATABASE_URL not available, try DIRECT_URL
  try {
    const directUrl = env.directUrl();
    if (directUrl) {
      return directUrl;
    }
  } catch (error) {
    // DIRECT_URL not set, continue to fallback
  }

  // Final fallback to DATABASE_URL
  const databaseUrl = env.databaseUrl();
  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error('Neither DIRECT_URL nor DATABASE_URL is set');
}

const connectionUrl = getConnectionUrl();

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

