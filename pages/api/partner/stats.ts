import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { getPartnerVenueStatsWithDateRange } from '@/lib/stats-enhanced';
import { assertTier, featureGate } from '@/lib/subscription';
import { SubscriptionTier } from '@prisma/client';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (!partner.venueId) {
    return apiResponse.error(res, 400, 'Partner not associated with a venue');
  }

  const includeAdvanced = req.query.includeAdvanced === 'true' || req.query.includeAdvanced === '1';
  const subscriptionTier = partner.venue?.subscriptionTier ?? SubscriptionTier.BASIC;

  if (includeAdvanced) {
    const allowed = assertTier(subscriptionTier, SubscriptionTier.PRO, res);
    if (!allowed) {
      return;
    }
  }

  try {
    // Parse date range from query params
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await getPartnerVenueStatsWithDateRange(partner.venueId, start, end);
    if (!includeAdvanced) {
      const basicStats = {
        pageViews: stats.pageViews,
        uniqueStudents: stats.uniqueStudents,
        qrGenerated: stats.qrGenerated,
        discountsRedeemed: stats.discountsRedeemed,
        verifiedStudentVisits: stats.verifiedStudentVisits,
        recentQrCodes: stats.recentQrCodes,
      };
      return apiResponse.success(res, {
        stats: basicStats,
        subscriptionTier,
        featureFlags: featureGate(subscriptionTier),
      });
    }
    return apiResponse.success(res, {
      stats,
      subscriptionTier,
      featureFlags: featureGate(subscriptionTier),
    });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    return apiResponse.error(res, 500, 'Failed to fetch statistics');
  }
});
