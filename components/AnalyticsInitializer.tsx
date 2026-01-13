'use client';

import { useEffect } from 'react';
import { getConsent } from '@/lib/cookies/consent';
import { initAnalytics } from '@/lib/analytics';

/**
 * Client component that initializes analytics on mount if consent exists
 * This ensures analytics is initialized even if the banner was already dismissed
 */
export function AnalyticsInitializer() {
  useEffect(() => {
    const consent = getConsent();
    if (consent) {
      initAnalytics(consent);
    }
  }, []);

  return null;
}
