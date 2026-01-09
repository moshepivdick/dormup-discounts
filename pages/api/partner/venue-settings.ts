import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  avgStudentBill: z.number().min(0).optional(),
});

export default withMethods(['PUT'], async (req: NextApiRequest, res: NextApiResponse) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (!partner.venueId) {
    return apiResponse.error(res, 400, 'Partner not associated with a venue');
  }

  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
    }

    const venue = await prisma.venue.update({
      where: { id: partner.venueId },
      data: {
        avgStudentBill: parsed.data.avgStudentBill,
      } as any, // Type assertion needed until Prisma client is regenerated
    });

    return apiResponse.success(res, { venue: { avgStudentBill: (venue as any).avgStudentBill } });
  } catch (error) {
    console.error('Error updating venue settings:', error);
    return apiResponse.error(res, 500, 'Failed to update settings');
  }
});
