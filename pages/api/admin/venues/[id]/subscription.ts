import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { subscriptionTierSchema } from '@/lib/validators';

const bodySchema = z.object({
  subscriptionTier: subscriptionTierSchema,
  requestId: z.string().uuid().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await auth.getAdminFromRequest(req);
  if (!admin) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  const id = Number(req.query.id);
  if (Number.isNaN(id)) {
    return apiResponse.error(res, 400, 'Invalid id');
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return apiResponse.error(res, 405, 'Method not allowed');
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
  }

  const { subscriptionTier, requestId } = parsed.data;

  const venue = await prisma.venue.update({
    where: { id },
    data: { subscriptionTier },
  });

  if (requestId) {
    try {
      await prisma.upgradeRequest.updateMany({
        where: {
          id: requestId,
          venueId: id,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
        },
      });
    } catch (error: any) {
      if (error?.code !== 'P2021') {
        throw error;
      }
    }
  }

  return apiResponse.success(res, { venue });
}
