/**
 * Geocoding utilities for converting addresses to coordinates.
 * Uses Google Geocoding API to convert address strings to latitude/longitude.
 */

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress?: string;
};

/**
 * Geocodes an address string to coordinates using Google Geocoding API.
 * 
 * @param address - The address string to geocode (e.g., "Via Roma, 10, 47921 Rimini RN")
 * @param apiKey - Google Maps API key (should be stored in environment variable)
 * @returns Promise resolving to coordinates and optionally formatted address
 * @throws Error if geocoding fails or API key is missing
 * 
 * @example
 * ```ts
 * const result = await geocodeAddress("Via Roma, 10, 47921 Rimini RN", process.env.GOOGLE_MAPS_API_KEY);
 * console.log(result.lat, result.lng); // 44.0678, 12.5695
 * ```
 */
export async function geocodeAddress(
  address: string,
  apiKey?: string,
): Promise<GeocodeResult> {
  const key = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error(
      'Google Maps API key is required. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY environment variable.',
    );
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.formatted_address,
      };
    } else if (data.status === 'ZERO_RESULTS') {
      throw new Error(`No results found for address: ${address}`);
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Geocoding API quota exceeded');
    } else {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to geocode address: ${String(error)}`);
  }
}

/**
 * Batch geocodes multiple addresses.
 * 
 * @param addresses - Array of address strings to geocode
 * @param apiKey - Google Maps API key
 * @returns Promise resolving to array of geocode results in same order as input
 */
export async function geocodeAddresses(
  addresses: string[],
  apiKey?: string,
): Promise<GeocodeResult[]> {
  // Process sequentially to avoid rate limiting
  const results: GeocodeResult[] = [];
  
  for (const address of addresses) {
    try {
      const result = await geocodeAddress(address, apiKey);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to geocode "${address}":`, error);
      // Continue with next address even if one fails
      results.push({ lat: 0, lng: 0 });
    }
  }
  
  return results;
}

