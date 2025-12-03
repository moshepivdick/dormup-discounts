import { useEffect, useRef, useState, type ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { auth } from '@/lib/auth';

export default function PartnerScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showQRConfirmation, setShowQRConfirmation] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    
    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current as HTMLVideoElement,
        async (result, err) => {
          if (result) {
            // Stop scanning when QR code is detected
            try {
              const video = videoRef.current;
              if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
                video.srcObject = null;
              }
            } catch (e) {
              // Ignore cleanup errors
            }
            // QR code confirmation - instant, no debounce
            await handleConfirm(result.getText(), true);
          }
          if (err && err.name === 'NotAllowedError') {
            setPermissionDenied(true);
          }
        },
      )
      .catch(() => setPermissionDenied(true));
    return () => {
      // Cleanup: stop scanning when component unmounts
      try {
        const video = videoRef.current;
        if (video && video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const confirmCodeAPI = async (codeToConfirm: string, isQRCode = false) => {
    if (isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setStatus('loading');

    try {
      const response = await fetch('/api/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToConfirm }),
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
        
        // Show QR confirmation modal instead of auto-redirect
        if (isQRCode) {
          setShowQRConfirmation(true);
        }
      } else {
        setStatus('error');
        setMessage(msg || 'Invalid code');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to confirm code. Please try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleConfirm = async (rawCode?: string, isQRCode = false) => {
    const code = (rawCode ?? manualCode).trim().toUpperCase();
    if (!code) return;

    // Validate input length (6-8 chars) for manual entry
    if (!isQRCode && (code.length < 6 || code.length > 8)) {
      setStatus('error');
      setMessage('Code must be between 6 and 8 characters');
      return;
    }

    // QR code confirmation - instant, no debounce
    if (isQRCode) {
      await confirmCodeAPI(code, true);
      return;
    }

    // Manual entry - add 800ms debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      confirmCodeAPI(code);
    }, 800);
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
              // Prevent submission if already loading
              if (status === 'loading' || isSubmittingRef.current) {
                return;
              }
              handleConfirm();
            }}
          >
            <input
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold tracking-[0.4em] text-slate-900"
              maxLength={8}
              placeholder="ABC123"
              value={manualCode}
              onChange={(event) => {
                // Only update state, no API calls
                setManualCode(event.target.value.toUpperCase());
              }}
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading' || isSubmittingRef.current}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {status === 'loading' ? 'Confirming…' : 'Confirm'}
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
        {/* QR Code Confirmation Modal */}
        {showQRConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg
                    className="h-8 w-8 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                QR Code Confirmed
              </h2>
              <p className="mb-6 text-sm text-slate-600">
                The discount code has been successfully confirmed.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowQRConfirmation(false);
                  router.push('/partner');
                }}
                className="w-full rounded-2xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700"
              >
                Advance
              </button>
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

