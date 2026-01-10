/**
 * Discount code configuration constants
 */

// Time-to-live for discount codes in minutes
// Codes expire after this duration from creation
export const DISCOUNT_CODE_TTL_MINUTES = 5;

// Convert to milliseconds for Date calculations
export const DISCOUNT_CODE_TTL_MS = DISCOUNT_CODE_TTL_MINUTES * 60 * 1000;

