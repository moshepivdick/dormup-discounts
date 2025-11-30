import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  const id = Number(req.query.id);
  if (Number.isNaN(id)) {
    return apiResponse.error(res, 400, 'Invalid venue id');
  }

  try {
    const venue = await prisma.venue.findUnique({ where: { id } });
    if (!venue || !venue.isActive) {
      return apiResponse.error(res, 404, 'Venue not found');
    }
    return apiResponse.success(res, { venue });
  } catch (error) {
    return apiResponse.error(res, 500, 'Unable to load venue', error);
  }
});

