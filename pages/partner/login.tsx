import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { auth } from '@/lib/auth';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const response = await fetch('/api/partner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      router.push('/partner');
      return;
    }

    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    setErrorMessage(data?.message ?? 'Invalid credentials');
    setStatus('idle');
  };

  return (
    <>
      <Head>
        <title>Partner Login | DormUp Discounts</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Partner access
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Sign in to confirm codes
          </h1>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {errorMessage && (
              <p className="text-sm text-rose-600">{errorMessage}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {status === 'loading' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (partner) {
    return {
      redirect: {
        destination: '/partner',
        permanent: false,
      },
    };
  }

  return { props: {} };
};

