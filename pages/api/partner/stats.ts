import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { getPartnerVenueStats } from '@/lib/stats';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (!partner.venueId) {
    return apiResponse.error(res, 400, 'Partner not associated with a venue');
  }

  try {
    const stats = await getPartnerVenueStats(partner.venueId);
    return apiResponse.success(res, { stats });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    return apiResponse.error(res, 500, 'Failed to fetch statistics');
  }
});
