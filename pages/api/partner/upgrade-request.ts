import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { partnerUpgradeRequestSchema } from '@/lib/validators';
import { hasTier } from '@/lib/subscription';
import { SubscriptionTier } from '@prisma/client';

const hasUpgradeRequestTable = async () => {
  const result = await prisma.$queryRaw<Array<{ exists: string | null }>>`
    SELECT to_regclass('public."UpgradeRequest"') as "exists";
  `;
  return Boolean(result[0]?.exists);
};

export default withMethods(['GET', 'POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (!partner.venueId) {
    return apiResponse.error(res, 400, 'Partner not associated with a venue');
  }

  const currentTier = (partner.venue?.subscriptionTier ?? SubscriptionTier.BASIC) as SubscriptionTier;

  if (req.method === 'GET') {
    const tableReady = await hasUpgradeRequestTable();
    if (!tableReady) {
      return apiResponse.success(res, {
        currentTier,
        pending: [],
      });
    }
    try {
      const pending = await prisma.upgradeRequest.findMany({
        where: {
          venueId: partner.venueId,
          partnerId: partner.id,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });
      return apiResponse.success(res, {
        currentTier,
        pending,
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return apiResponse.success(res, {
          currentTier,
          pending: [],
        });
      }
      throw error;
    }
  }

  const parsed = partnerUpgradeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
  }

  const { note } = parsed.data;
  const toTier = parsed.data.toTier as SubscriptionTier;

  if (hasTier(currentTier, toTier)) {
    return apiResponse.error(res, 400, 'Requested tier must be above current tier');
  }

  const tableReady = await hasUpgradeRequestTable();
  if (!tableReady) {
    return apiResponse.error(res, 503, 'Upgrade requests are not available yet', {
      error: 'UPGRADE_REQUESTS_NOT_READY',
      message: 'Apply database migrations to enable upgrade requests in the admin panel.',
    });
  }

  const existing = await prisma.upgradeRequest.findFirst({
    where: {
      venueId: partner.venueId,
      partnerId: partner.id,
      status: 'PENDING',
      toTier,
    },
  });

  if (existing) {
    return apiResponse.error(res, 409, 'Upgrade request already pending', {
      error: 'REQUEST_PENDING',
      requestId: existing.id,
    });
  }

  const request = await prisma.upgradeRequest.create({
    data: {
      venueId: partner.venueId,
      partnerId: partner.id,
      fromTier: currentTier,
      toTier,
      status: 'PENDING',
      note: note?.trim() || null,
    },
  });

  return apiResponse.success(res, { request });
});
