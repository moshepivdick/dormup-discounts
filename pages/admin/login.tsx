import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { auth } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (payload.success) {
      router.push('/admin/dashboard');
    } else {
      setError(payload.message ?? 'Invalid credentials');
      setStatus('idle');
    }
  };

  return (
    <>
      <Head>
        <title>Admin login | DormUp</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-3xl bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-200">
            <BrandLogo /> Admin
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-white/80">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-white/80">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-emerald-400 disabled:bg-emerald-800"
            >
              {status === 'loading' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

AdminLoginPage.getLayout = (page: ReactNode) => page;

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const admin = await auth.getAdminFromRequest(req);
  if (admin) {
    return {
      redirect: { destination: '/admin/dashboard', permanent: false },
    };
  }
  return { props: {} };
};

