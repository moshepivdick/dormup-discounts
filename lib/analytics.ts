/**
 * Analytics Initialization
 * Only initializes if user has consented to analytics cookies
 * 
 * TODO: Replace this placeholder with your actual analytics provider code
 * Examples:
 * - Google Analytics: gtag('config', 'GA_MEASUREMENT_ID')
 * - PostHog: posthog.init('YOUR_API_KEY')
 * - Plausible: window.plausible = window.plausible || function() { ... }
 */

import type { CookieConsent } from './cookies/consent';

let analyticsInitialized = false;

/**
 * Initialize analytics if consent is given
 * Call this after consent is set or on page load
 */
export function initAnalytics(consent: CookieConsent | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Only initialize if analytics consent is true
  if (consent?.analytics === true && !analyticsInitialized) {
    // TODO: Add your analytics provider initialization here
    // Example:
    // if (typeof gtag !== 'undefined') {
    //   gtag('config', process.env.NEXT_PUBLIC_GA_ID);
    // }
    
    // Example for PostHog:
    // if (typeof posthog !== 'undefined') {
    //   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    //     api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    //   });
    // }

    analyticsInitialized = true;
    console.log('[Analytics] Initialized with user consent');
  } else if (consent?.analytics === false) {
    // Analytics disabled
    analyticsInitialized = false;
    console.log('[Analytics] Disabled - user did not consent');
  }
}

/**
 * Track an event (only if analytics is initialized)
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !analyticsInitialized) {
    return;
  }

  // TODO: Add your analytics event tracking here
  // Example:
  // if (typeof gtag !== 'undefined') {
  //   gtag('event', eventName, properties);
  // }
  
  // Example for PostHog:
  // if (typeof posthog !== 'undefined') {
  //   posthog.capture(eventName, properties);
  // }

  console.log('[Analytics] Event:', eventName, properties);
}

/**
 * Check if analytics is currently initialized
 */
export function isAnalyticsInitialized(): boolean {
  return analyticsInitialized;
}
