import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

/**
 * Check if user is admin and has admin_gate cookie
 * Returns user profile if authorized, otherwise redirects
 */
export async function requireAdminAccess(slug: string) {
  // Verify slug matches secret
  const expectedSlug = env.adminPanelSlug();
  if (slug !== expectedSlug) {
    redirect('/404');
  }

  // Check session - use getUser() for security
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login?redirect=' + encodeURIComponent(`/control/${slug}`));
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    redirect('/');
  }

  // Check for admin_gate cookie
  const cookieStore = await cookies();
  const adminGateCookie = cookieStore.get('admin_gate');

  if (!adminGateCookie) {
    // Redirect to main page to enter password
    redirect(`/control/${slug}`);
  }

  return {
    userId: user.id,
    email: user.email || '',
  };
}

