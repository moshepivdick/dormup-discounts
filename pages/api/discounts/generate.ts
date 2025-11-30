// DISABLED: Discount generation is now handled client-side
// This API route is kept for reference but disabled to avoid Prisma errors

import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Return 410 Gone to indicate this endpoint is no longer available
  return res.status(410).json({
    error: 'This endpoint is disabled',
    message: 'Discount codes are now generated client-side. No API call needed.',
  });
};

/* ORIGINAL IMPLEMENTATION (DISABLED):
import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateDiscountCode, generateSlug } from '@/utils/random';
import { apiResponse, withMethods } from '@/lib/api';
import { DISCOUNT_CODE_TTL_MS } from '@/lib/discount-constants';

const MAX_ATTEMPTS = 5;

const payloadSchema = z.object({
  venueId: z.number().int().positive(),
});

const getBaseUrl = (req: NextApiRequest) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? 'http';
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost ?? req.headers.host ?? 'localhost:3000';
  return `${protocol}://${host}`;
};

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log('[DISCOUNT_GENERATE] Request received:', {
      method: req.method,
      body: req.body,
    });

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[DISCOUNT_GENERATE_ERROR] Validation failed:', parsed.error);
      return res.status(400).json({
        error: 'Failed to generate code',
        details: 'venueId is required',
      });
    }
    const { venueId } = parsed.data;

    console.log('[DISCOUNT_GENERATE] Looking up venue:', venueId);
    const venue = await prisma.venue.findUnique({ where: { id: Number(venueId) } });
    if (!venue || !venue.isActive) {
      console.error('[DISCOUNT_GENERATE_ERROR] Venue not found or inactive:', { venueId, venue });
      return res.status(404).json({
        error: 'Failed to generate code',
        details: 'Venue not found',
      });
    }

    console.log('[DISCOUNT_GENERATE] Venue found:', { id: venue.id, name: venue.name });

    // Step 1: Deactivate all existing active codes for this venue
    // Mark all 'generated' status codes as 'cancelled' before creating a new one
    console.log('[DISCOUNT_GENERATE] Deactivating existing active codes for venue:', venueId);
    const deactivatedCount = await prisma.discountUse.updateMany({
      where: {
        venueId: venue.id,
        status: 'generated',
      },
      data: {
        status: 'cancelled',
        confirmedAt: new Date(), // Mark as used/cancelled
      },
    });
    console.log('[DISCOUNT_GENERATE] Deactivated', deactivatedCount.count, 'existing codes');

    // Step 2: Always create a new discount code
    let attempt = 0;
    let discountUse;

    while (attempt < MAX_ATTEMPTS) {
      const code = generateDiscountCode(6 + attempt);
      try {
        const expiresAt = new Date(Date.now() + DISCOUNT_CODE_TTL_MS);
        
        console.log('[DISCOUNT_GENERATE] Attempting to create discount:', {
          attempt,
          venueId: venue.id,
          code,
          expiresAt: expiresAt.toISOString(),
        });

        discountUse = await prisma.discountUse.create({
          data: {
            venueId: venue.id,
            generatedCode: code,
            qrSlug: generateSlug(12),
            status: 'generated',
            expiresAt,
          },
        });

        console.log('[DISCOUNT_GENERATE] Successfully created discount:', {
          id: discountUse.id,
          code: discountUse.generatedCode,
        });
        break;
      } catch (error) {
        console.error('[DISCOUNT_GENERATE_ERROR]', {
          attempt,
          venueId: venue.id,
          error: error instanceof Error ? error.message : String(error),
          prismaError:
            error instanceof Prisma.PrismaClientKnownRequestError
              ? {
                  code: error.code,
                  meta: error.meta,
                }
              : null,
          fullError: error,
        });

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          console.log('[DISCOUNT_GENERATE] Unique constraint violation, retrying...');
          attempt += 1;
          continue;
        }
        
        // Return detailed error
        return res.status(500).json({
          error: 'Failed to generate code',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!discountUse) {
      console.error('[DISCOUNT_GENERATE_ERROR] Failed to generate unique code after', MAX_ATTEMPTS, 'attempts');
      return res.status(500).json({
        error: 'Failed to generate code',
        details: 'Unable to generate unique discount code after multiple attempts',
      });
    }

    const slug = discountUse.qrSlug ?? discountUse.generatedCode;
    const qrUrl = `${getBaseUrl(req)}/discount/${slug}`;

    const responseData = {
      code: discountUse.generatedCode,
      qrUrl,
      useId: discountUse.id,
      qrSlug: slug,
      expiresAt: discountUse.expiresAt.toISOString(),
    };

    console.log('[DISCOUNT_GENERATE] Returning success response:', responseData);

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('[DISCOUNT_GENERATE_ERROR] Unexpected error:', error);
    return res.status(500).json({
      error: 'Failed to generate code',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});
*/

