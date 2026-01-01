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
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Failed to generate code',
        details: 'venueId is required',
      });
    }
    const { venueId } = parsed.data;

    const venue = await prisma.venue.findUnique({ where: { id: Number(venueId) } });
    if (!venue || !venue.isActive) {
      return res.status(404).json({
        error: 'Failed to generate code',
        details: 'Venue not found',
      });
    }

    // Step 1: Deactivate all existing active codes for this venue
    // Mark all 'generated' status codes as 'cancelled' before creating a new one
    await prisma.discountUse.updateMany({
      where: {
        venueId: venue.id,
        status: 'generated',
      },
      data: {
        status: 'cancelled',
        confirmedAt: new Date(),
      },
    });

    // Step 2: Always create a new discount code
    let attempt = 0;
    let discountUse;

    while (attempt < MAX_ATTEMPTS) {
      const code = generateDiscountCode(6 + attempt);
      try {
        const expiresAt = new Date(Date.now() + DISCOUNT_CODE_TTL_MS);

        discountUse = await prisma.discountUse.create({
          data: {
            venueId: venue.id,
            generatedCode: code,
            qrSlug: generateSlug(12),
            status: 'generated',
            expiresAt,
          },
        });
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          attempt += 1;
          continue;
        }
        
        return res.status(500).json({
          error: 'Failed to generate code',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!discountUse) {
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

    return res.status(201).json(responseData);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate code',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

