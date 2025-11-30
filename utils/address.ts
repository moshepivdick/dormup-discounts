/**
 * Utilities for extracting and formatting addresses from venue data.
 */

/**
 * Extracts address from venue details text if it contains "Address:" pattern.
 * 
 * @param details - The venue details text that may contain "Address: ..."
 * @returns The extracted address string or null if not found
 * 
 * @example
 * ```ts
 * const details = "Great pizza place. Address: Via Roma, 10. Open daily.";
 * const address = extractAddressFromDetails(details);
 * // Returns: "Via Roma, 10"
 * ```
 */
export function extractAddressFromDetails(
  details: string | null | undefined,
): string | null {
  if (!details) return null;
  const addressMatch = details.match(/Address:\s*([^.]*)/i);
  if (addressMatch && addressMatch[1]) {
    return addressMatch[1].trim();
  }
  return null;
}

/**
 * Removes address text from details for display purposes.
 * 
 * @param details - The venue details text
 * @returns Details text with address pattern removed
 */
export function removeAddressFromDetails(
  details: string | null | undefined,
): string | null {
  if (!details) return null;
  // Remove "Address: ..." pattern (everything from "Address:" up to and including the next period)
  return details.replace(/Address:\s*[^.]*\.\s*/i, '').trim() || null;
}

/**
 * Builds a full address string from components.
 * 
 * @param streetAddress - Street address (optional)
 * @param city - City name
 * @returns Full address string
 */
export function buildFullAddress(
  streetAddress: string | null | undefined,
  city: string,
): string {
  if (streetAddress) {
    return `${streetAddress}, ${city}`;
  }
  return city;
}

