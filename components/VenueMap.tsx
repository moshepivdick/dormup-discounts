import { useCallback, useState } from 'react';

const handleStartNavigation = (directionsUrl: string | null) => {
  if (!directionsUrl) return;
  window.open(directionsUrl, '_blank', 'noopener,noreferrer');
};

type VenueMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  name?: string;
  fullAddress?: string | null;
  directionsUrl?: string | null;
};

export function VenueMap({
  latitude,
  longitude,
  name,
  fullAddress,
  directionsUrl,
}: VenueMapProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(async () => {
    if (!fullAddress) return;

    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy address', e);
    }
  }, [fullAddress]);

  // Always use coordinates to generate the map iframe URL dynamically
  if (latitude && longitude) {
    // Generate map iframe URL from coordinates and address (always fresh, never cached)
    // If address is provided, use it for better accuracy; otherwise use coordinates only
    const query = fullAddress 
      ? encodeURIComponent(fullAddress)
      : `${latitude},${longitude}`;
    const src = `https://maps.google.com/maps?q=${query}&z=16&output=embed`;
    const mapContainer = (
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <iframe
          title={`Map for ${name ?? 'venue'}`}
          src={src}
          width="100%"
          height="260"
          loading="lazy"
          className="border-0"
          referrerPolicy="no-referrer-when-downgrade"
          key={`${latitude}-${longitude}`}
        />
      </div>
    );

    return (
      <div className="mt-6">
        {directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative group cursor-pointer"
          >
            <div className="relative">
              {mapContainer}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            </div>
          </a>
        ) : (
          mapContainer
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {directionsUrl && (
            <button
              type="button"
              onClick={() => handleStartNavigation(directionsUrl)}
              className="inline-flex items-center justify-center rounded-xl bg-black text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-800 active:scale-95 transition"
            >
              Start navigation
            </button>
          )}

          {fullAddress && (
            <button
              type="button"
              onClick={handleCopyAddress}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50 active:scale-95 transition"
            >
              {copied ? 'Copied!' : 'Copy address'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback: show buttons even if coordinates are missing
  if (directionsUrl || fullAddress) {
    return (
      <div className="mt-6">
        <div className="mt-3 flex flex-wrap gap-2">
          {directionsUrl && (
            <button
              type="button"
              onClick={() => handleStartNavigation(directionsUrl)}
              className="inline-flex items-center justify-center rounded-xl bg-black text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-800 active:scale-95 transition"
            >
              Start navigation
            </button>
          )}

          {fullAddress && (
            <button
              type="button"
              onClick={handleCopyAddress}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50 active:scale-95 transition"
            >
              {copied ? 'Copied!' : 'Copy address'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

