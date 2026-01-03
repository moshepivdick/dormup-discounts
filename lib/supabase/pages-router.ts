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
          return Object.entries(cookies)
            .filter(([, value]) => value !== undefined)
            .map(([name, value]) => ({
              name,
              value: value as string,
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





