import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Temporarily show all venues to restore them after migration issue
    const venues = await prisma.venue.findMany({
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });

    return apiResponse.success(res, { venues });
  } catch (error) {
    console.error('Error loading venues:', error);
    return apiResponse.error(res, 500, 'Unable to load venues', error);
  }
});

