import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';
import { discountConfirmSchema } from '@/lib/validators';

/**
 * API endpoint to check the status of a discount code
 * Used by users to verify if their code has been confirmed by a partner
 */
export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  const parsed = discountConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Code is required');
  }

  const formattedCode = parsed.data.code.trim().toUpperCase();

  try {
    const discountUse = await prisma.discountUse.findUnique({
      where: { generatedCode: formattedCode },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        confirmedAt: true,
        createdAt: true,
      },
    });

    if (!discountUse) {
      return apiResponse.error(res, 404, 'Code not found');
    }

    // Check if code is expired
    const now = new Date();
    if (discountUse.expiresAt < now && discountUse.status === 'generated') {
      // Mark as expired if not already marked
      await prisma.discountUse.update({
        where: { id: discountUse.id },
        data: { status: 'expired' },
      });
      return apiResponse.success(res, {
        status: 'expired',
        message: 'Code has expired',
        expiresAt: discountUse.expiresAt.toISOString(),
      });
    }

    return apiResponse.success(res, {
      status: discountUse.status,
      message:
        discountUse.status === 'confirmed'
          ? 'Code has been confirmed'
          : discountUse.status === 'expired'
            ? 'Code has expired'
            : discountUse.status === 'cancelled'
              ? 'Code has been cancelled'
              : 'Code is active',
      expiresAt: discountUse.expiresAt.toISOString(),
      confirmedAt: discountUse.confirmedAt?.toISOString() ?? null,
      createdAt: discountUse.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error checking code status:', error);
    return apiResponse.error(res, 500, 'Failed to check code status');
  }
});
