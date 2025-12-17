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
  const isSubmittingRef = useRef(false);
  
  // SCAN LOCK STATE: Prevents multiple API requests for the same QR code
  // When true, all scan callback events are ignored until explicitly unlocked by user
  const [scanLocked, setScanLocked] = useState(false);
  
  // SCAN LOCK REF: Synchronous reference for immediate checks in callbacks
  // React state updates are asynchronous, so we need a ref for instant lock checking
  // This prevents race conditions where multiple callbacks might execute before state updates
  const scanLockedRef = useRef(false);
  
  // Track the last processed QR code to prevent re-processing the same value
  // This ensures even if scanLocked is temporarily false, we won't process duplicates
  const lastScannedCodeRef = useRef<string | null>(null);
  
  // Track if scanning is currently active (camera stream running)
  const isScanningActiveRef = useRef(false);

  // FLASHLIGHT/TORCH STATE: Track torch availability and state
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    // Only start scanning if not locked
    if (scanLocked) {
      return;
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    isScanningActiveRef.current = true;
    
    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current as HTMLVideoElement,
        async (result, err) => {
          // CRITICAL: Ignore all scan events while scanLocked is true
          // Use ref for synchronous check - state updates are async and could cause race conditions
          // This prevents multiple API requests when the QR code is visible for multiple frames
          if (scanLockedRef.current) {
            return;
          }

          if (result) {
            const scannedText = result.getText().trim().toUpperCase();
            
            // Prevent re-processing the same QR code value
            // Even if somehow the lock is temporarily false, we won't process duplicates
            if (lastScannedCodeRef.current === scannedText) {
              return;
            }

            // LOCK SCANNING IMMEDIATELY to prevent any further scan events from processing
            // Set both ref (synchronous) and state (for UI) BEFORE any async operations
            // This ensures no race conditions where multiple callbacks execute simultaneously
            scanLockedRef.current = true;
            setScanLocked(true);
            lastScannedCodeRef.current = scannedText;
            isScanningActiveRef.current = false;

            // Stop the video stream immediately to prevent further frame processing
            try {
              const video = videoRef.current;
              if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach((track) => {
                  track.stop();
                  // Turn off torch when stopping stream
                  if (track === cameraTrackRef.current && torchOn) {
                    try {
                      track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
                    } catch (e) {
                      // Ignore torch errors during cleanup
                    }
                  }
                });
                video.srcObject = null;
              }
            } catch (e) {
              // Ignore cleanup errors
            }
            cameraTrackRef.current = null;
            setTorchOn(false);

            // Process the QR code - this will make the API call
            // Scanning remains locked until user explicitly resumes
            await handleQRConfirm(scannedText);
          }
          if (err && err.name === 'NotAllowedError') {
            setPermissionDenied(true);
          }
        },
      )
      .catch(() => setPermissionDenied(true));
    
    return () => {
      // Cleanup: stop scanning when component unmounts or dependencies change
      try {
        const video = videoRef.current;
        if (video && video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
            // Turn off torch when stopping stream
            if (track === cameraTrackRef.current && torchOn) {
              try {
                track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
              } catch (e) {
                // Ignore torch errors during cleanup
              }
            }
          });
          video.srcObject = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      cameraTrackRef.current = null;
      setTorchOn(false);
      isScanningActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanLocked]); // Re-run effect when scanLocked changes

  // Detect torch support after camera stream is initialized
  useEffect(() => {
    const checkTorchSupport = () => {
      const video = videoRef.current;
      if (!video || !video.srcObject) {
        return;
      }

      try {
        const stream = video.srcObject as MediaStream;
        const videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack) {
          cameraTrackRef.current = videoTrack;
          
          // Check if torch capability is available
          const capabilities = videoTrack.getCapabilities();
          const hasTorch = capabilities && 'torch' in capabilities && capabilities.torch === true;
          
          setTorchAvailable(hasTorch);
          
          // If torch was on before, restore it (e.g., after resume)
          if (hasTorch && torchOn) {
            videoTrack.applyConstraints({ advanced: [{ torch: true }] }).catch(() => {
              // Gracefully handle failure - torch may not be available anymore
              setTorchOn(false);
            });
          }
        }
      } catch (e) {
        // Gracefully handle errors (e.g., iOS Safari doesn't support getCapabilities)
        setTorchAvailable(false);
      }
    };

    // Check torch support when video stream is ready
    if (!permissionDenied && !scanLocked) {
      const video = videoRef.current;
      if (video) {
        // Wait for video to be ready
        const handleLoadedMetadata = () => {
          checkTorchSupport();
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Also check immediately in case metadata is already loaded
        if (video.readyState >= 1) {
          checkTorchSupport();
        }
        
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      }
    }
  }, [permissionDenied, scanLocked, torchOn]);

  // Toggle flashlight/torch on/off
  const toggleFlash = async () => {
    const track = cameraTrackRef.current;
    if (!track || !torchAvailable) {
      return;
    }

    try {
      const newTorchState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newTorchState }],
      });
      setTorchOn(newTorchState);
    } catch (error) {
      // Gracefully handle failures (e.g., iOS Safari, permission issues)
      // Silently fail - don't crash the app
      console.warn('Failed to toggle torch:', error);
      setTorchOn(false);
    }
  };

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
      
      // NOTE: Scanning remains LOCKED after success or error
      // User must explicitly click "Scan again" to resume scanning
      // This prevents automatic re-scanning and ensures only ONE request per QR code
    } catch (error) {
      setStatus('error');
      setMessage('Failed to confirm code. Please try again.');
      // Scanning remains locked even on error - user must explicitly resume
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // QR code confirmation handler - called only when QR is scanned
  // NOTE: This function is only called when scanLocked is false and a new QR code is detected
  const handleQRConfirm = async (qrCode: string) => {
    const code = qrCode.trim().toUpperCase();
    if (!code) {
      // If code is invalid, unlock scanning to allow retry
      // Reset both ref and state for immediate unlock
      scanLockedRef.current = false;
      setScanLocked(false);
      lastScannedCodeRef.current = null;
      return;
    }
    await confirmCodeAPI(code, true);
  };

  // Resume scanning: Unlocks scanning and allows the user to scan a new QR code
  // This must be explicitly called by user interaction (e.g., "Scan again" button)
  const resumeScanning = () => {
    // Reset scan lock state (both ref and state) to allow new scans
    // Ref must be reset synchronously before state for immediate effect
    scanLockedRef.current = false;
    setScanLocked(false);
    // Clear the last scanned code so the same code can be scanned again if needed
    lastScannedCodeRef.current = null;
    // Reset status to idle so the UI shows ready state
    setStatus('idle');
    setMessage('');
    setShowQRConfirmation(false);
    // Note: torch state is preserved - it will be restored when camera stream restarts
    // The useEffect will automatically restart scanning when scanLocked becomes false
  };

  // Manual code confirmation handler - called only on form submit
  const handleManualConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    // Validate input length (6-8 chars)
    if (code.length < 6 || code.length > 8) {
      setStatus('error');
      setMessage('Code must be between 6 and 8 characters');
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
            <>
              <video ref={videoRef} className="h-full w-full object-cover" />
              {/* Scan Box Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* Darkened overlay outside scan box */}
                <div className="absolute inset-0">
                  {/* Top overlay */}
                  <div
                    className="absolute left-0 right-0 top-0 bg-black/60"
                    style={{
                      height: 'calc((100% - min(280px, 75vw)) / 2)',
                    }}
                  />
                  {/* Bottom overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black/60"
                    style={{
                      height: 'calc((100% - min(280px, 75vw)) / 2)',
                    }}
                  />
                  {/* Left overlay */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/60"
                    style={{
                      width: 'calc((100% - min(280px, 75vw)) / 2)',
                      height: 'min(280px, 75vw)',
                    }}
                  />
                  {/* Right overlay */}
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/60"
                    style={{
                      width: 'calc((100% - min(280px, 75vw)) / 2)',
                      height: 'min(280px, 75vw)',
                    }}
                  />
                </div>
                {/* Scan box frame with green outline */}
                <div
                  className="relative"
                  style={{
                    width: 'min(280px, 75vw)',
                    height: 'min(280px, 75vw)',
                  }}
                >
                  {/* Corner indicators */}
                  <div className="absolute inset-0">
                    {/* Top-left corner */}
                    <div
                      className="absolute -top-1 -left-1"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderTop: '4px solid #014D40',
                        borderLeft: '4px solid #014D40',
                        borderTopLeftRadius: '12px',
                      }}
                    />
                    {/* Top-right corner */}
                    <div
                      className="absolute -top-1 -right-1"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderTop: '4px solid #014D40',
                        borderRight: '4px solid #014D40',
                        borderTopRightRadius: '12px',
                      }}
                    />
                    {/* Bottom-left corner */}
                    <div
                      className="absolute -bottom-1 -left-1"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderBottom: '4px solid #014D40',
                        borderLeft: '4px solid #014D40',
                        borderBottomLeftRadius: '12px',
                      }}
                    />
                    {/* Bottom-right corner */}
                    <div
                      className="absolute -bottom-1 -right-1"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderBottom: '4px solid #014D40',
                        borderRight: '4px solid #014D40',
                        borderBottomRightRadius: '12px',
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Flashlight toggle button - only show if torch is available */}
              {torchAvailable && (
                <button
                  type="button"
                  onClick={toggleFlash}
                  className="absolute right-4 top-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition hover:bg-black/80 active:scale-95"
                  aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                >
                  {torchOn ? (
                    <svg
                      className="h-7 w-7 text-yellow-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-7 w-7 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  )}
                </button>
              )}
              {/* Helper text below scanner */}
              <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 px-6 text-center">
                <p className="text-sm font-medium text-white drop-shadow-lg">
                  Hold the QR code inside the frame
                </p>
                {torchAvailable && (
                  <p className="mt-1 text-xs text-white/80 drop-shadow-lg">
                    Use Flash if lighting is poor
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-900 text-center text-sm text-white/70">
              Camera permission denied. Use manual entry below.
            </div>
          )}
        </div>
        <div className="space-y-4 bg-white px-6 py-6 text-slate-900">
          {/* Scan status indicator - shows when scanning is paused/locked */}
          {scanLocked && status !== 'loading' && (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Scanning paused
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click &quot;Scan again&quot; to resume scanning
              </p>
            </div>
          )}
          
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
          {status !== 'idle' && (
            <div className="space-y-3">
              <p
                className={`text-center text-sm font-semibold ${
                  status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {message}
              </p>
              {/* Scan again button - appears after scan result (success or error) */}
              {/* Only show for QR scans, not manual entry */}
              {scanLocked && status !== 'loading' && (
                <button
                  type="button"
                  onClick={resumeScanning}
                  className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Scan again
                </button>
              )}
            </div>
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
              <div className="flex flex-col gap-3">
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
                {/* Scan again button in modal - allows user to scan another QR code */}
                <button
                  type="button"
                  onClick={() => {
                    setShowQRConfirmation(false);
                    resumeScanning();
                  }}
                  className="w-full rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Scan again
                </button>
              </div>
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

