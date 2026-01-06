import Head from 'next/head';
import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { auth } from '@/lib/auth';
import Link from 'next/link';

type PartnerResponse = {
  success: boolean;
  message: string;
};

type PartnerPageProps = {
  partner: {
    email: string;
    venueName: string;
    venueId: number;
  };
};

export default function PartnerPage({ partner }: PartnerPageProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [feedback, setFeedback] = useState<PartnerResponse | null>(null);
  const isSubmittingRef = useRef(false);

  const handleLogout = async () => {
    await fetch('/api/partner/logout', { method: 'POST' });
    router.push('/partner/login');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const trimmedCode = code.trim().toUpperCase();
    
    // Validate input length (6-8 chars)
    if (trimmedCode.length < 6 || trimmedCode.length > 8) {
      setFeedback({
        success: false,
        message: 'Code must be between 6 and 8 characters',
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (status === 'loading' || isSubmittingRef.current) {
      return;
    }

    // Call API immediately - no debounce, no auto-retry
    isSubmittingRef.current = true;
    setStatus('loading');
    setFeedback(null);

    try {
      const response = await fetch('/api/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmedCode }),
      });

      const raw = await response.json();
      const payload: PartnerResponse = {
        success: raw.success ?? false,
        message: raw.data?.message ?? raw.message ?? '',
      };
      setFeedback(payload);
      if (payload.success) {
        setCode('');
      }
    } catch (error) {
      setFeedback({
        success: false,
        message: 'Failed to confirm code. Please try again.',
      });
    } finally {
      setStatus('idle');
      isSubmittingRef.current = false;
    }
  };

  return (
    <>
      <Head>
        <title>Partner Console | DormUp Discounts</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Logged in as
              </p>
              <p className="text-base font-semibold text-slate-900">
                {partner.email}
              </p>
              <p className="text-sm text-slate-500">{partner.venueName}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              Log out
            </button>
          </div>
          <div className="mb-4 flex gap-3">
            <Link
              href="/partner/scan"
              className="flex-1 inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Open scanner
            </Link>
            <Link
              href="/partner/stats"
              className="flex-1 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              View statistics
            </Link>
          </div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Partner console
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Confirm discount usage
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the code shown by the student. Each code can only be used
            once.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Discount code
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg tracking-widest text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                placeholder="ABC123"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase())
                }
                maxLength={8}
              />
            </label>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {status === 'loading' ? 'Confirming…' : 'Confirm usage'}
            </button>
          </form>

          {feedback && (
            <p
              className={`mt-4 text-center text-sm font-medium ${
                feedback.success ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PartnerPageProps> = async ({
  req,
}) => {
  const partner = await auth.getPartnerFromRequest(req);

  if (!partner || !partner.venue) {
    return {
      redirect: {
        destination: '/partner/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      partner: {
        email: partner.email,
        venueName: partner.venue.name,
        venueId: partner.venueId,
      },
    },
  };
};

