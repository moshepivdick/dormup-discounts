import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';

const AdminLogoutPage: NextPage & { getLayout?: (page: ReactNode) => ReactNode } = () => {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
      router.replace('/admin/login');
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p>Signing out…</p>
    </main>
  );
};

AdminLogoutPage.getLayout = (page: ReactNode) => page;

export default AdminLogoutPage;

