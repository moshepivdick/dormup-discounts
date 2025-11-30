import type { NextApiRequest, NextApiResponse } from 'next';
import { geocodeAddress } from '@/utils/geocoding';

type GeocodeResponse =
  | {
      success: true;
      lat: number;
      lng: number;
      formattedAddress?: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * API route for geocoding addresses to coordinates.
 * 
 * POST /api/geocode
 * Body: { address: string }
 * 
 * Returns: { success: true, lat: number, lng: number, formattedAddress?: string }
 *          or { success: false, error: string }
 * 
 * This endpoint can be used in admin/backoffice when creating or updating venues
 * to automatically populate latitude and longitude from an address string.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  const { address } = req.body;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Address is required and must be a string.',
    });
  }

  try {
    const result = await geocodeAddress(address);
    return res.status(200).json({
      success: true,
      lat: result.lat,
      lng: result.lng,
      formattedAddress: result.formattedAddress,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to geocode address',
    });
  }
}

