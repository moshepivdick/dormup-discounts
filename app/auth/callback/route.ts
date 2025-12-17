import { createClient } from '@/lib/supabase/server';
import { syncProfileAfterConfirm } from '@/app/actions/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL('/auth/login?error=auth_failed', requestUrl.origin));
    }

    if (data.user) {
      // Sync verified_student status
      await syncProfileAfterConfirm(data.user.id);
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}

