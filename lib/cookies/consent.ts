/**
 * Cookie Consent Management
 * GDPR-compliant consent storage and retrieval
 */

export type CookieConsent = {
  necessary: true; // Always true, cannot be disabled
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  version: number; // Start at 1
  updatedAt: string; // ISO timestamp
  locale: 'en' | 'it';
};

const COOKIE_NAME = 'dormup_cookie_consent';
const STORAGE_KEY = 'dormup_cookie_consent';
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60; // 180 days in seconds

/**
 * Get consent from cookie or localStorage (client-side only)
 * Returns null if no consent exists or if corrupted
 */
export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Try cookie first
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1];

    if (cookieValue) {
      const decoded = decodeURIComponent(cookieValue);
      const parsed = JSON.parse(decoded) as CookieConsent;
      // Validate structure
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.necessary === true &&
        typeof parsed.analytics === 'boolean' &&
        typeof parsed.preferences === 'boolean' &&
        typeof parsed.marketing === 'boolean' &&
        typeof parsed.version === 'number' &&
        typeof parsed.updatedAt === 'string' &&
        (parsed.locale === 'en' || parsed.locale === 'it')
      ) {
        return parsed;
      }
    }

    // Fallback to localStorage
    const storageValue = localStorage.getItem(STORAGE_KEY);
    if (storageValue) {
      const parsed = JSON.parse(storageValue) as CookieConsent;
      // Validate structure
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.necessary === true &&
        typeof parsed.analytics === 'boolean' &&
        typeof parsed.preferences === 'boolean' &&
        typeof parsed.marketing === 'boolean' &&
        typeof parsed.version === 'number' &&
        typeof parsed.updatedAt === 'string' &&
        (parsed.locale === 'en' || parsed.locale === 'it')
      ) {
        // Sync back to cookie
        setConsent(parsed);
        return parsed;
      }
    }
  } catch (error) {
    // If parsing fails, treat as no consent
    console.warn('Failed to parse consent:', error);
    return null;
  }

  return null;
}

/**
 * Set consent in both cookie and localStorage (client-side only)
 */
export function setConsent(consent: CookieConsent): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const jsonString = JSON.stringify(consent);
    const encoded = encodeURIComponent(jsonString);

    // Set cookie
    document.cookie = `${COOKIE_NAME}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;

    // Set localStorage as fallback
    localStorage.setItem(STORAGE_KEY, jsonString);
  } catch (error) {
    console.error('Failed to set consent:', error);
  }
}

/**
 * Check if user has given consent (any consent, not necessarily all categories)
 */
export function hasConsent(): boolean {
  return getConsent() !== null;
}

/**
 * Detect locale from pathname
 * Returns 'it' if path starts with /it, otherwise 'en'
 */
export function detectLocale(pathname: string): 'en' | 'it' {
  return pathname.startsWith('/it') ? 'it' : 'en';
}

/**
 * Create default consent object
 */
export function createDefaultConsent(
  locale: 'en' | 'it' = 'en',
  analytics: boolean = false,
  preferences: boolean = false,
  marketing: boolean = false,
): CookieConsent {
  return {
    necessary: true,
    analytics,
    preferences,
    marketing,
    version: 1,
    updatedAt: new Date().toISOString(),
    locale,
  };
}
