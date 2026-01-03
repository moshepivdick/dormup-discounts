import { createServerClient } from '@supabase/ssr';
import type { IncomingMessage } from 'http';
import { parse } from 'cookie';

export function createClientFromRequest(req: IncomingMessage) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parse(cookieHeader);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll() {
          // In API routes, we can't set cookies directly
          // Cookies are set via response headers
        },
      },
    },
  );
}





