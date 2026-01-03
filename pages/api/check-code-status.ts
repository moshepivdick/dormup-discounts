import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';

const payloadSchema = z.object({
  code: z.string().min(4).max(12),
});

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'Code is required');
    }

    const formattedCode = parsed.data.code.trim().toUpperCase();

    const discountUse = await prisma.discountUse.findUnique({
      where: { generatedCode: formattedCode },
      select: {
        status: true,
        expiresAt: true,
        confirmedAt: true,
      },
    });

    if (!discountUse) {
      return apiResponse.error(res, 404, 'Code not found');
    }

    return apiResponse.success(res, {
      status: discountUse.status,
      isConfirmed: discountUse.status === 'confirmed',
      isExpired: discountUse.status === 'expired' || discountUse.expiresAt < new Date(),
      confirmedAt: discountUse.confirmedAt?.toISOString() || null,
    });
  } catch (error) {
    return apiResponse.error(res, 500, 'Failed to check code status');
  }
});









