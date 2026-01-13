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
      try {
        // Parse URL properly to avoid breaking it
        const urlObj = new URL(databaseUrl);
        
        // Remove existing parameters we want to override
        urlObj.searchParams.delete('connection_limit');
        urlObj.searchParams.delete('pool_timeout');
        urlObj.searchParams.delete('pgbouncer');
        
        // For serverless, use connection_limit=1 as recommended by Supabase
        // This prevents "max clients reached" errors in Session mode
        urlObj.searchParams.set('pgbouncer', 'true');
        urlObj.searchParams.set('connection_limit', '1');
        urlObj.searchParams.set('pool_timeout', '10');
        
        return urlObj.toString();
      } catch (error) {
        // If URL parsing fails, fall back to string manipulation
        // but be more careful about it
        let url = databaseUrl;
        
        // Remove existing parameters
        url = url.replace(/[?&]connection_limit=\d+/gi, '');
        url = url.replace(/[?&]pool_timeout=\d+/gi, '');
        url = url.replace(/[?&]pgbouncer=[^&]*/gi, '');
        
        // Clean up double separators
        url = url.replace(/[?&]+/g, (match, offset) => offset === 0 ? '?' : '&');
        url = url.replace(/[?&]$/, '');
        
        // Add new parameters
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}pgbouncer=true&connection_limit=1&pool_timeout=10`;
        
        return url;
      }
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

