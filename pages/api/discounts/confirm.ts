import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { discountConfirmSchema } from '@/lib/validators';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * Get client IP address for audit logging
 */
const getClientIp = (req: NextApiRequest): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.socket.remoteAddress ?? 'unknown';
  return ip;
};

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: 'confirm',
    limit: 10,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  const parsed = discountConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Code is required');
  }

  const formattedCode = parsed.data.code.trim().toUpperCase();
  const clientIp = getClientIp(req);
  const now = new Date();

  try {
    // ATOMIC UPDATE: Use updateMany with status check to prevent race conditions
    // This ensures only one confirmation can succeed even with concurrent requests
    const updateResult = await prisma.discountUse.updateMany({
      where: {
        generatedCode: formattedCode,
        status: 'generated', // Atomic check: only update if status is still 'generated'
        venueId: partner.venueId, // Ensure code belongs to partner's venue
        expiresAt: { gte: now }, // Ensure code is not expired
      },
      data: {
        status: 'confirmed',
        confirmedAt: now,
      },
    });

    // If no rows were updated, the code doesn't exist, is already used, expired, or doesn't belong to this venue
    if (updateResult.count === 0) {
      // Fetch the code to provide specific error message
      const discountUse = await prisma.discountUse.findUnique({
        where: { generatedCode: formattedCode },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          venueId: true,
          user_id: true,
        },
      });

      if (!discountUse) {
        // Log failed confirmation attempt
        console.warn(`[AUDIT] Failed confirmation attempt: Code not found`, {
          code: formattedCode,
          partnerId: partner.id,
          venueId: partner.venueId,
          ip: clientIp,
          timestamp: now.toISOString(),
        });
        return apiResponse.error(res, 404, 'Code not found ❌');
      }

      if (discountUse.status !== 'generated') {
        // Log attempted reuse
        console.warn(`[AUDIT] Attempted reuse of code`, {
          code: formattedCode,
          currentStatus: discountUse.status,
          partnerId: partner.id,
          venueId: partner.venueId,
          ip: clientIp,
          timestamp: now.toISOString(),
        });
        return apiResponse.error(res, 400, 'Code already used ❌');
      }

      if (discountUse.expiresAt < now) {
        // Mark as expired if not already marked
        await prisma.discountUse.update({
          where: { id: discountUse.id },
          data: { status: 'expired' },
        });
        return apiResponse.error(res, 400, 'Code has expired ❌');
      }

      if (discountUse.venueId !== partner.venueId) {
        // Log unauthorized access attempt
        console.warn(`[AUDIT] Unauthorized confirmation attempt`, {
          code: formattedCode,
          partnerId: partner.id,
          partnerVenueId: partner.venueId,
          codeVenueId: discountUse.venueId,
          ip: clientIp,
          timestamp: now.toISOString(),
        });
        return apiResponse.error(res, 403, 'Code does not belong to your venue ❌');
      }

      // Fallback error
      return apiResponse.error(res, 400, 'Code cannot be confirmed ❌');
    }

    // Success: Log successful confirmation
    const confirmedCode = await prisma.discountUse.findUnique({
      where: { generatedCode: formattedCode },
      select: {
        id: true,
        user_id: true,
        venueId: true,
        confirmedAt: true,
      },
    });

    console.info(`[AUDIT] Code confirmed successfully`, {
      code: formattedCode,
      codeId: confirmedCode?.id,
      userId: confirmedCode?.user_id,
      partnerId: partner.id,
      venueId: partner.venueId,
      ip: clientIp,
      timestamp: now.toISOString(),
    });

    return apiResponse.success(res, { message: 'Discount confirmed ✅' });
  } catch (error) {
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`[AUDIT] Database error during confirmation`, {
        discountCode: formattedCode,
        partnerId: partner.id,
        venueId: partner.venueId,
        ip: clientIp,
        error: error.message,
        prismaErrorCode: error.code,
        timestamp: now.toISOString(),
      });
    } else {
      console.error(`[AUDIT] Unexpected error during confirmation`, {
        code: formattedCode,
        partnerId: partner.id,
        venueId: partner.venueId,
        ip: clientIp,
        error: error instanceof Error ? error.message : String(error),
        timestamp: now.toISOString(),
      });
    }

    return apiResponse.error(res, 500, 'Failed to confirm code. Please try again.');
  }
});

