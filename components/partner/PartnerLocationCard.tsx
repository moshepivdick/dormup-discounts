'use client';

import { useEffect, useState } from 'react';
import { VenueMap } from '@/components/VenueMap';
import { buildGoogleMapsDirectionsUrl, type LatLng } from '@/utils/maps';

export type PartnerLocationData = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type PartnerLocationCardProps = {
  partner: PartnerLocationData;
};

/**
 * Reusable component for displaying partner/venue location with map and navigation actions.
 * Automatically handles:
 * - Embedded Google Maps iframe centered on partner coordinates
 * - "Start navigation" button with user location detection
 * - "Copy address" button
 */
export function PartnerLocationCard({ partner }: PartnerLocationCardProps) {
  const [directionsUrl, setDirectionsUrl] = useState<string | null>(null);

  // Get user's location and build directions URL
  useEffect(() => {
    const { latitude, longitude, address } = partner;

    if (!latitude || !longitude) {
      // Fallback to address-only directions if no coordinates
      const url = buildGoogleMapsDirectionsUrl(null, null, address, null);
      setDirectionsUrl(url);
      return;
    }

    if (!('geolocation' in navigator)) {
      // Browser does not support geolocation → fallback to Current Location
      const url = buildGoogleMapsDirectionsUrl(latitude, longitude, address, null);
      setDirectionsUrl(url);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Use real GPS coordinates for origin
        const origin: LatLng = { lat: userLat, lng: userLng };
        const url = buildGoogleMapsDirectionsUrl(latitude, longitude, address, origin);
        setDirectionsUrl(url);
      },
      (err) => {
        console.warn('User geolocation ERROR:', err);
        // Permission denied or error → fallback to Current+Location
        const url = buildGoogleMapsDirectionsUrl(latitude, longitude, address, null);
        setDirectionsUrl(url);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [partner]);

  return (
    <VenueMap
      latitude={partner.latitude}
      longitude={partner.longitude}
      name={partner.name}
      fullAddress={partner.address}
      directionsUrl={directionsUrl}
    />
  );
}

