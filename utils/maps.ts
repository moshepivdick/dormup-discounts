export type LatLng = {
  lat: number;
  lng: number;
};

/**
 * Build a Google Maps directions URL.
 *
 * @param destLat latitude of the destination (partner)
 * @param destLng longitude of the destination (partner)
 * @param address fallback address string (used when coords are missing)
 * @param origin optional LatLng for the user location; if null → use "Current+Location"
 */
export function buildGoogleMapsDirectionsUrl(
  destLat: number | null,
  destLng: number | null,
  address: string | null,
  origin: LatLng | null,
): string {
  const base = 'https://www.google.com/maps/dir/?api=1';

  // origin
  // if we have explicit origin coordinates → use them
  // otherwise → let Google use "Current Location"
  const originParam = origin
    ? `origin=${encodeURIComponent(`${origin.lat},${origin.lng}`)}`
    : 'origin=Current+Location';

  // destination:
  // 1) if we have address → use address (more human-readable, Google Maps geocodes it accurately)
  // 2) otherwise, if we have destLat/destLng → use coordinates
  // 3) fallback: empty destination (but try to avoid this in practice)
  let destinationParam = '';
  if (address) {
    destinationParam = `destination=${encodeURIComponent(address)}`;
  } else if (destLat != null && destLng != null) {
    destinationParam = `destination=${encodeURIComponent(`${destLat},${destLng}`)}`;
  } else {
    destinationParam = '';
  }

  const travelMode = 'travelmode=walking';

  const params = [originParam, destinationParam, travelMode]
    .filter(Boolean)
    .join('&');

  return `${base}&${params}`;
}

