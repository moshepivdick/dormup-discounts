import { useEffect, useRef, useState, type ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { auth } from '@/lib/auth';

export default function PartnerScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current as HTMLVideoElement,
        async (result, err) => {
          if (result) {
            await handleConfirm(result.getText());
          }
          if (err && err.name === 'NotAllowedError') {
            setPermissionDenied(true);
          }
        },
      )
      .catch(() => setPermissionDenied(true));
    return () => {
      // Cleanup: stop scanning when component unmounts
      if (reader) {
        try {
          // BrowserMultiFormatReader doesn't have reset, just stop scanning
          const video = document.getElementById('video') as HTMLVideoElement;
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async (rawCode?: string) => {
    const code = (rawCode ?? manualCode).toUpperCase();
    if (!code) return;

    setStatus('loading');
    const response = await fetch('/api/confirm-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const payload = await response.json();
    const success = payload.success ?? false;
    const msg = payload.data?.message ?? payload.message ?? '';

    if (success) {
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      setStatus('success');
      setMessage(msg || 'Discount confirmed ✔️');
      setTimeout(() => {
        router.push('/partner');
      }, 2000);
    } else {
      setStatus('error');
      setMessage(msg || 'Invalid code');
    }
  };

  return (
    <>
      <Head>
        <title>Scanner partner | DormUp Discounts</title>
      </Head>
      <main className="flex min-h-screen flex-col bg-black text-white">
        <div className="relative flex-1">
          {!permissionDenied ? (
            <video ref={videoRef} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-900 text-center text-sm text-white/70">
              Camera permission denied. Use manual entry below.
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 border-4 border-white/40"></div>
        </div>
        <div className="space-y-4 bg-white px-6 py-6 text-slate-900">
          <p className="text-sm font-semibold text-slate-700">
            Manual code entry
          </p>
          <form
            className="flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            <input
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold tracking-[0.4em] text-slate-900"
              maxLength={8}
              placeholder="ABC123"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Confirm
            </button>
          </form>
          {status !== 'idle' && (
            <p
              className={`text-center text-sm font-semibold ${
                status === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {message}
            </p>
          )}
        </div>
        {status === 'success' && (
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-emerald-900/80 text-white">
            <div className="rounded-3xl bg-white/10 px-8 py-6 text-center backdrop-blur">
              <p className="text-2xl font-semibold">Discount confirmed ✔️</p>
              <p className="mt-2 text-sm text-emerald-100">Redirecting…</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

PartnerScanPage.getLayout = (page: ReactNode) => page;

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return {
      redirect: { destination: '/partner/login', permanent: false },
    };
  }
  return { props: {} };
};

