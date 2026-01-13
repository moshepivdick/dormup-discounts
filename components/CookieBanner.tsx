'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getConsent,
  setConsent,
  createDefaultConsent,
  detectLocale,
} from '@/lib/cookies/consent';
import { initAnalytics } from '@/lib/analytics';
import { CookiePreferencesModal } from './CookiePreferencesModal';

const translations = {
  en: {
    title: 'We respect your privacy',
    text: 'We use cookies to ensure essential functionality, analyze platform usage, and improve student experience. You can accept all cookies, reject non-essential ones, or customize your preferences.',
    acceptAll: 'Accept all',
    rejectNonEssential: 'Reject non-essential',
    customize: 'Customize',
    privacyPolicy: 'Privacy Policy',
  },
  it: {
    title: 'Rispettiamo la tua privacy',
    text: 'Utilizziamo cookie per garantire il corretto funzionamento della piattaforma, analizzare l\'utilizzo e migliorare l\'esperienza degli studenti. Puoi accettare tutti i cookie, rifiutare quelli non essenziali o personalizzare le tue preferenze.',
    acceptAll: 'Accetta tutti',
    rejectNonEssential: 'Rifiuta non essenziali',
    customize: 'Personalizza',
    privacyPolicy: 'Privacy Policy',
  },
};

export function CookieBanner() {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [locale, setLocale] = useState<'en' | 'it'>('en');
  const [mounted, setMounted] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Use useLayoutEffect for synchronous check on mount
  useLayoutEffect(() => {
    // Mark as mounted to ensure we're on client side
    setMounted(true);
    
    // Detect locale from pathname
    const detectedLocale = detectLocale(pathname || '/');
    setLocale(detectedLocale);

    // Check if consent exists - show banner if no consent
    const consent = getConsent();
    if (!consent) {
      setShowBanner(true);
      // Trigger animation after a small delay
      setTimeout(() => {
        setAnimate(true);
      }, 60);
    } else {
      setShowBanner(false);
      // Initialize analytics if consent was given
      initAnalytics(consent);
    }
  }, [pathname]);

  // Update locale if pathname changes
  useEffect(() => {
    if (mounted) {
      const detectedLocale = detectLocale(pathname || '/');
      setLocale(detectedLocale);
    }
  }, [pathname, mounted]);

  const t = translations[locale];

  const handleAcceptAll = () => {
    const consent = createDefaultConsent(locale, true, true, true);
    setConsent(consent);
    initAnalytics(consent);
    setShowBanner(false);
  };

  const handleRejectNonEssential = () => {
    const consent = createDefaultConsent(locale, false, false, false);
    setConsent(consent);
    initAnalytics(consent);
    setShowBanner(false);
  };

  const handleCustomize = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    // Check if consent was set in modal
    const consent = getConsent();
    if (consent) {
      setShowBanner(false);
    }
  };

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Dark overlay for mobile - dims the screen when banner is visible */}
      {showBanner && (
        <div
          className="fixed inset-0 bg-black/40 z-[9997] transition-opacity duration-300 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Subtle gradient layer for visual separation */}
      <div
        className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-[9998]"
        style={{
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0.1) 0%, transparent 100%)',
        }}
      />

      {/* Main banner container */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9999] px-4 sm:px-6 cookie-banner-enter ${
          animate ? 'cookie-banner-enter-active' : ''
        }`}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        {/* Centered card container */}
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-black/10 bg-white/90 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.12)] p-4 sm:p-6">
            <h3 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
              {t.title}
            </h3>
            <p className="mb-5 text-sm text-black/70 leading-relaxed">{t.text}</p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAcceptAll}
                className="rounded-xl bg-[#0F5A44] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d4d38] focus:outline-none focus:ring-2 focus:ring-[#0F5A44] focus:ring-offset-2"
              >
                {t.acceptAll}
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/80 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
              >
                {t.rejectNonEssential}
              </button>
              <button
                onClick={handleCustomize}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/80 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
              >
                {t.customize}
              </button>
              <Link
                href="/privacy"
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/80 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
              >
                {t.privacyPolicy}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesModal
        isOpen={showModal}
        onClose={handleModalClose}
        locale={locale}
      />
    </>
  );
}
