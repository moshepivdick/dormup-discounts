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
  const [showAlreadyUsedWarning, setShowAlreadyUsedWarning] = useState(false);
  const isSubmittingRef = useRef(false);
  const processedCodesRef = useRef<Set<string>>(new Set()); // Track processed codes to prevent duplicate scans

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    
    // Capture video element at effect start to avoid stale ref in cleanup
    const videoElement = videoRef.current as HTMLVideoElement;
    
    reader
      .decodeFromVideoDevice(
        undefined,
        videoElement,
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
            // QR code confirmation - instant, single API call
            await handleQRConfirm(result.getText());
          }
          if (err && err.name === 'NotAllowedError') {
            setPermissionDenied(true);
          }
        },
      )
      .catch(() => setPermissionDenied(true));
    return () => {
      // Cleanup: stop scanning when component unmounts
      // Use captured videoElement to avoid stale ref warning
      try {
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoElement.srcObject = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmCodeAPI = async (codeToConfirm: string, isQRCode = false) => {
    // Prevent duplicate processing of the same code
    if (processedCodesRef.current.has(codeToConfirm)) {
      console.log('Code already processed, skipping:', codeToConfirm);
      return;
    }

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
        // Mark code as processed to prevent duplicate scans
        processedCodesRef.current.add(codeToConfirm);
        
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
        // Check if code is already used - show warning and close scanner
        const isAlreadyUsed = msg.includes('already confirmed') || 
                             msg.includes('already used') || 
                             msg.includes('Code already');
        
        setStatus('error');
        setMessage(msg || 'Invalid code');
        
        // Stop video stream immediately if code is already used
        if (isAlreadyUsed) {
          try {
            const video = videoRef.current;
            if (video && video.srcObject) {
              const stream = video.srcObject as MediaStream;
              stream.getTracks().forEach((track) => track.stop());
              video.srcObject = null;
            }
            // Reader cleanup is handled by useEffect cleanup
          } catch (e) {
            // Ignore cleanup errors
          }
          
          // If code is already used, show warning modal
          if (isQRCode) {
            // For QR codes, show modal and close scanner
            setShowAlreadyUsedWarning(true);
            // Close scanner and redirect after showing warning
            setTimeout(() => {
              setShowAlreadyUsedWarning(false);
              router.push('/partner');
            }, 3000); // Show warning for 3 seconds, then redirect
          } else {
            // For manual entry, just show warning message (modal not needed)
            // The error message is already displayed below the input
          }
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to confirm code. Please try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // QR code confirmation handler - called only when QR is scanned
  const handleQRConfirm = async (qrCode: string) => {
    const code = qrCode.trim().toUpperCase();
    if (!code) return;
    
    // Additional validation: check code format (5-8 for backward compatibility)
    if (code.length < 5 || code.length > 8) {
      setStatus('error');
      setMessage('Invalid code format');
      return;
    }
    
    // Prevent duplicate scans with debounce
    if (processedCodesRef.current.has(code)) {
      return;
    }
    
    await confirmCodeAPI(code, true);
  };

  // Manual code confirmation handler - called only on form submit
  const handleManualConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    // Validate input length (5-8 chars for backward compatibility with old codes)
    if (code.length < 5 || code.length > 8) {
      setStatus('error');
      setMessage('Code must be between 5 and 8 characters');
      return;
    }

    // Prevent multiple simultaneous requests
    if (status === 'loading' || isSubmittingRef.current) {
      return;
    }

    // Call API immediately - no debounce, no auto-retry
    await confirmCodeAPI(code, false);
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
            onSubmit={handleManualConfirm}
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
          {status !== 'idle' && !showAlreadyUsedWarning && (
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
        
        {/* Already Used Warning Modal */}
        {showAlreadyUsedWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <svg
                    className="h-8 w-8 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                Code Already Used
              </h2>
              <p className="mb-6 text-sm text-slate-600">
                This discount code has already been confirmed and cannot be used again.
              </p>
              <p className="mb-4 text-xs text-slate-500">
                Scanner will close automatically...
              </p>
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

