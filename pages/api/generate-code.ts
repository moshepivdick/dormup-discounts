import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateDiscountCode } from '@/utils/random';
import { apiResponse, withMethods } from '@/lib/api';
import { DISCOUNT_CODE_TTL_MS } from '@/lib/discount-constants';

const MAX_ATTEMPTS = 5;

const payloadSchema = z.object({
  venueId: z.number().int().positive(),
});

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'venueId is required');
    }
    const { venueId } = parsed.data;

    const venue = await prisma.venue.findUnique({ where: { id: Number(venueId) } });
    if (!venue || !venue.isActive) {
      return apiResponse.error(res, 404, 'Venue not found');
    }

    // Create a new discount code
    let attempt = 0;
    let discountUse;

    while (attempt < MAX_ATTEMPTS) {
      const uniqueCode = generateDiscountCode(8);
      try {
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + DISCOUNT_CODE_TTL_MS);

        discountUse = await prisma.discountUse.create({
          data: {
            venueId: venue.id,
            generatedCode: uniqueCode,
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
        
        return apiResponse.error(res, 500, 'Failed to generate code');
      }
    }

    if (!discountUse) {
      return apiResponse.error(res, 500, 'Unable to generate unique discount code');
    }

    return apiResponse.success(res, {
      code: discountUse.generatedCode,
      expiresAt: discountUse.expiresAt.toISOString(),
    });
  } catch (error) {
    return apiResponse.error(res, 500, 'Failed to generate code');
  }
});

