import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * Cron endpoint to auto-expire discount codes that have passed their expiration time.
 *
 * This endpoint should be called periodically (e.g., every 5-10 minutes) by an external
 * cron scheduler (e.g., Vercel Cron Jobs, GitHub Actions, or a traditional cron service).
 *
 * Security:
 * - For MVP, uses a simple secret check via query parameter or header
 * - In production, consider using Vercel's built-in cron protection or IP allowlisting
 *
 * Usage:
 *   GET /api/cron/expire-codes?secret=YOUR_CRON_SECRET
 *   or
 *   GET /api/cron/expire-codes
 *   with header: x-cron-secret: YOUR_CRON_SECRET
 *
 * Response:
 *   {
 *     success: true,
 *     expiredCount: number,
 *     ranAt: string (ISO timestamp)
 *   }
 */

const CRON_SECRET = process.env.CRON_SECRET || 'change-me-in-production';

const isValidCronRequest = (req: NextApiRequest): boolean => {
  // Check query parameter
  const querySecret = req.query.secret as string | undefined;
  if (querySecret === CRON_SECRET) {
    return true;
  }

  // Check header
  const headerSecret = req.headers['x-cron-secret'] as string | undefined;
  if (headerSecret === CRON_SECRET) {
    return true;
  }

  // In development, allow without secret (remove in production)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  if (!isValidCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();

    // Find all generated codes that have expired
    const result = await prisma.discountUse.updateMany({
      where: {
        status: 'generated',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'expired',
      },
    });

    return res.status(200).json({
      success: true,
      expiredCount: result.count,
      ranAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error expiring codes:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

