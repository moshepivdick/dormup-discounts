import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { AdminPasswordForm } from '@/components/admin/AdminPasswordForm';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminControlPage({ params }: PageProps) {
  const { slug } = await params;

  // Verify slug matches secret
  const expectedSlug = env.adminPanelSlug();
  if (slug !== expectedSlug) {
    redirect('/404');
  }

  // Check session
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/login?redirect=' + encodeURIComponent(`/control/${slug}`));
  }

  // Check if user is admin - use Supabase query with snake_case field name
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    redirect('/');
  }

  // Check for admin_gate cookie
  const cookieStore = await cookies();
  const adminGateCookie = cookieStore.get('admin_gate');

  // If no cookie, show password form
  if (!adminGateCookie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Access</h1>
            <p className="text-slate-600 mb-6">Enter admin password to continue</p>
            <AdminPasswordForm />
          </div>
        </div>
      </div>
    );
  }

  // Show admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <AdminDashboard />
    </div>
  );
}

