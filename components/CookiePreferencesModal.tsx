'use client';

import { useState, useEffect } from 'react';
import type { CookieConsent } from '@/lib/cookies/consent';
import {
  getConsent,
  setConsent,
  createDefaultConsent,
  detectLocale,
} from '@/lib/cookies/consent';
import { initAnalytics } from '@/lib/analytics';

type CookiePreferencesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  locale: 'en' | 'it';
};

const translations = {
  en: {
    title: 'Cookie Preferences',
    description:
      'Manage your cookie preferences. Necessary cookies are always enabled for the platform to function.',
    necessary: 'Necessary',
    necessaryDesc: 'Required for the platform to function. Cannot be disabled.',
    analytics: 'Analytics',
    analyticsDesc: 'Help us understand how you use the platform to improve your experience.',
    preferences: 'Preferences',
    preferencesDesc: 'Remember your settings and preferences.',
    marketing: 'Marketing',
    marketingDesc: 'Used for advertising and marketing purposes.',
    save: 'Save Preferences',
    cancel: 'Cancel',
  },
  it: {
    title: 'Preferenze Cookie',
    description:
      'Gestisci le tue preferenze sui cookie. I cookie necessari sono sempre abilitati per il funzionamento della piattaforma.',
    necessary: 'Necessari',
    necessaryDesc: 'Richiesti per il funzionamento della piattaforma. Non possono essere disabilitati.',
    analytics: 'Analisi',
    analyticsDesc: 'Ci aiutano a capire come usi la piattaforma per migliorare la tua esperienza.',
    preferences: 'Preferenze',
    preferencesDesc: 'Ricordano le tue impostazioni e preferenze.',
    marketing: 'Marketing',
    marketingDesc: 'Utilizzati per pubblicità e scopi di marketing.',
    save: 'Salva Preferenze',
    cancel: 'Annulla',
  },
};

export function CookiePreferencesModal({
  isOpen,
  onClose,
  locale,
}: CookiePreferencesModalProps) {
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setPreferences(existing.preferences);
        setMarketing(existing.marketing);
      }
    }
  }, [isOpen]);

  const t = translations[locale];

  const handleSave = () => {
    const consent = createDefaultConsent(locale, analytics, preferences, marketing);
    setConsent(consent);
    initAnalytics(consent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-xl font-semibold text-slate-900">{t.title}</h2>
        <p className="mb-6 text-sm text-slate-600">{t.description}</p>

        <div className="space-y-4">
          {/* Necessary - always enabled */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                  />
                  <label className="font-medium text-slate-900">{t.necessary}</label>
                </div>
                <p className="mt-1 text-xs text-slate-600">{t.necessaryDesc}</p>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label className="font-medium text-slate-900">{t.analytics}</label>
                </div>
                <p className="mt-1 text-xs text-slate-600">{t.analyticsDesc}</p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preferences}
                    onChange={(e) => setPreferences(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label className="font-medium text-slate-900">{t.preferences}</label>
                </div>
                <p className="mt-1 text-xs text-slate-600">{t.preferencesDesc}</p>
              </div>
            </div>
          </div>

          {/* Marketing */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label className="font-medium text-slate-900">{t.marketing}</label>
                </div>
                <p className="mt-1 text-xs text-slate-600">{t.marketingDesc}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
