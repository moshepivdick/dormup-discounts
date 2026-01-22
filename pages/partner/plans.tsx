import Head from 'next/head';
import { useMemo, useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { tierRank } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PartnerPlansProps = {
  partner: {
    email: string;
    venueName: string;
    venueId: number;
    subscriptionTier: 'BASIC' | 'PRO' | 'MAX';
  };
};

type UpgradeRequest = {
  id: string;
  toTier: 'PRO' | 'MAX';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

const planFeatures: Record<'BASIC' | 'PRO' | 'MAX', string[]> = {
  BASIC: [
    'Venue listing presence',
    '1 active offer',
    'QR generation + confirmation',
    'Basic counters (views, QR generated, QR redeemed)',
  ],
  PRO: [
    'Advanced analytics & conversion insights',
    '2–3 concurrent offers',
    'Monthly PDF report',
    'Comparisons over time',
  ],
  MAX: [
    'Exports (CSV / XLSX)',
    'White-label report options',
    'Top placement badge',
    'Priority support flags',
  ],
};

export default function PartnerPlansPage({ partner }: PartnerPlansProps) {
  const [note, setNote] = useState('');
  const [pendingRequests, setPendingRequests] = useState<UpgradeRequest[]>([]);
  const [submittingTier, setSubmittingTier] = useState<'PRO' | 'MAX' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recommendedTier = useMemo(() => {
    if (partner.subscriptionTier === 'BASIC') return 'PRO';
    return 'MAX';
  }, [partner.subscriptionTier]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const response = await fetch('/api/partner/upgrade-request');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.pending) {
            setPendingRequests(data.data.pending);
          }
        }
      } catch (error) {
        console.error('Failed to load upgrade requests', error);
      }
    };
    fetchPending();
  }, []);

  const handleRequestUpgrade = async (toTier: 'PRO' | 'MAX') => {
    setSubmittingTier(toTier);
    setNotice(null);
    try {
      const response = await fetch('/api/partner/upgrade-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toTier, note: note.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.message || 'Failed to send request.');
        return;
      }
      setNotice('Request sent. We’ll activate it after review.');
      if (data.data?.request) {
        setPendingRequests((prev) => [data.data.request, ...prev]);
      }
    } catch (error) {
      setNotice('Failed to send request. Please try again.');
    } finally {
      setSubmittingTier(null);
    }
  };

  const isPendingTier = (tier: 'PRO' | 'MAX') =>
    pendingRequests.some((request) => request.toTier === tier && request.status === 'PENDING');

  const renderCTA = (tier: 'BASIC' | 'PRO' | 'MAX') => {
    if (tier === partner.subscriptionTier) {
      return (
        <Button disabled className="w-full">
          Current plan
        </Button>
      );
    }

    if (tierRank[tier] < tierRank[partner.subscriptionTier]) {
      return (
        <Button disabled variant="outline" className="w-full">
          Downgrade (contact admin)
        </Button>
      );
    }

    if (tier === 'BASIC') {
      return null;
    }

    if (isPendingTier(tier as 'PRO' | 'MAX')) {
      return (
        <Button disabled variant="outline" className="w-full">
          Request pending
        </Button>
      );
    }

    return (
      <Button
        onClick={() => handleRequestUpgrade(tier as 'PRO' | 'MAX')}
        disabled={submittingTier === tier}
        className="w-full"
      >
        {submittingTier === tier ? 'Sending…' : 'Request upgrade'}
      </Button>
    );
  };

  return (
    <>
      <Head>
        <title>Plans | DormUp Discounts</title>
      </Head>
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Plans</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Plans for {partner.venueName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">Compare what each tier unlocks.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Current: {partner.subscriptionTier}
              </span>
              <Link
                href="/partner"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Console
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-800">Optional note to admin</p>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Share context for your upgrade request (optional)"
              className="mt-3"
            />
            {notice ? (
              <p className="mt-3 text-sm font-semibold text-emerald-600">{notice}</p>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {(['BASIC', 'PRO', 'MAX'] as const).map((tier) => {
              const isRecommended = tier === recommendedTier;
              const isCurrent = tier === partner.subscriptionTier;
              return (
                <div
                  key={tier}
                  className={`flex h-full flex-col rounded-3xl border p-6 shadow-sm ${
                    isRecommended ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">{tier}</h2>
                    {isCurrent ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        You’re on {tier}
                      </span>
                    ) : isRecommended ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {planFeatures[tier].map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">{renderCTA(tier)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PartnerPlansProps> = async ({ req }) => {
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
        subscriptionTier: partner.venue.subscriptionTier || 'BASIC',
      },
    },
  };
};
