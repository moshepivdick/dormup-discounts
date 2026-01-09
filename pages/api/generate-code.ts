import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateDiscountCode, generateSlug } from '@/utils/random';
import { apiResponse, withMethods } from '@/lib/api';
import { DISCOUNT_CODE_TTL_MS } from '@/lib/discount-constants';
import { createClientFromRequest } from '@/lib/supabase/pages-router';

const MAX_ATTEMPTS = 5;

const payloadSchema = z.object({
  venueId: z.number().int().positive(),
});

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Try to get authenticated user (optional - allow anonymous code generation)
    const supabase = createClientFromRequest(req);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'venueId is required');
    }
    const { venueId } = parsed.data;

    // Use explicit select to avoid avgStudentBill if migration not applied
    let venue;
    try {
      venue = await prisma.venue.findUnique({
        where: { id: Number(venueId) },
        select: {
          id: true,
          isActive: true,
        },
      });
    } catch (error: any) {
      // Fallback to raw SQL if Prisma fails with P2022 (column not found)
      if (error?.code === 'P2022' && error?.meta?.column === 'Venue.avgStudentBill') {
        const rawVenue = await prisma.$queryRaw<Array<{
          id: number;
          isActive: boolean;
        }>>`
          SELECT id, "isActive"
          FROM public.venues
          WHERE id = ${Number(venueId)};
        `;
        venue = rawVenue?.[0] || null;
      } else {
        throw error;
      }
    }

    if (!venue || !venue.isActive) {
      return apiResponse.error(res, 404, 'Venue not found');
    }

    // Cancel any existing active codes for this venue (and user if authenticated)
    const cancelWhere: any = {
      venueId: venue.id,
      status: 'generated',
    };
    if (userId) {
      cancelWhere.user_id = userId;
    }
    await prisma.discountUse.updateMany({
      where: cancelWhere,
      data: {
        status: 'cancelled',
        confirmedAt: new Date(),
      },
    });

    // Create a new discount code with user_id
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
            qrSlug: generateSlug(12),
            status: 'generated',
            expiresAt,
            user_id: userId, // Link to authenticated user if available
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

