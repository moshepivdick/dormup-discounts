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
      // Parse and modify URL to ensure correct settings
      let url = databaseUrl;
      
      // Remove existing connection_limit and pool_timeout to set our own
      url = url.replace(/[?&]connection_limit=\d+/gi, '');
      url = url.replace(/[?&]pool_timeout=\d+/gi, '');
      url = url.replace(/[?&]pgbouncer=true/gi, '');
      
      // For serverless, use connection_limit=1 as recommended by Supabase
      // This prevents "max clients reached" errors in Session mode
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}pgbouncer=true&connection_limit=1&pool_timeout=10`;
      
      // Ensure we're using the pooled port (6543) if not already set
      // Supabase pooled connection should use port 6543
      if (!url.includes(':6543') && !url.includes(':5432')) {
        // If no port specified, assume it's already correct in the URL
        // Otherwise, we'd need to parse and replace, which is complex
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

  // Final fallback to DATABASE_URL (for development)
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
        url: connectionUrl,
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

