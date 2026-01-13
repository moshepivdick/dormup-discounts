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

  // Use useLayoutEffect for synchronous check on mount
  useLayoutEffect(() => {
    // Mark as mounted to ensure we're on client side
    setMounted(true);
    
    // Detect locale from pathname
    const detectedLocale = detectLocale(pathname || '/');
    setLocale(detectedLocale);

    // Check if consent exists - show banner if no consent
    const consent = getConsent();
    console.log('[CookieBanner] Consent check:', consent);
    if (!consent) {
      console.log('[CookieBanner] No consent found, showing banner');
      setShowBanner(true);
    } else {
      console.log('[CookieBanner] Consent found, hiding banner');
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
  if (!mounted || !showBanner) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg">
        <div className="p-4 sm:p-6">
          <h3 className="mb-2 text-base font-semibold text-slate-900">{t.title}</h3>
          <p className="mb-4 text-sm text-slate-600">{t.text}</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAcceptAll}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              {t.acceptAll}
            </button>
            <button
              onClick={handleRejectNonEssential}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.rejectNonEssential}
            </button>
            <button
              onClick={handleCustomize}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.customize}
            </button>
            <Link
              href="/privacy"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.privacyPolicy}
            </Link>
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
