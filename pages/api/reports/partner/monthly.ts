import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { getMonthlyPartnerReport, parseMonth } from '@/lib/reports';
import { prisma } from '@/lib/prisma';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Get month and partnerId parameters
  const month = req.query.month as string;
  const partnerIdParam = req.query.partnerId as string;

  // Verify admin or partner
  const admin = await auth.getAdminFromRequest(req);
  const partner = await auth.getPartnerFromRequest(req);

  if (!admin && !partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  // Determine which partner to query
  let venueId: number;
  if (admin && partnerIdParam) {
    // Admin can request any partner
    const requestedPartner = await prisma.partner.findUnique({
      where: { id: partnerIdParam },
      select: { venueId: true },
    });
    if (!requestedPartner) {
      return apiResponse.error(res, 404, 'Partner not found');
    }
    venueId = requestedPartner.venueId;
  } else if (partner) {
    // Partner can only request their own
    venueId = partner.venueId;
  } else {
    return apiResponse.error(res, 400, 'partnerId required for admin requests');
  }

  // Get month (default to current month)
  let monthStr = month;
  if (!monthStr) {
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;
    monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  }

  // Validate month format
  try {
    parseMonth(monthStr);
  } catch (error: any) {
    return apiResponse.error(res, 400, error.message || 'Invalid month format. Expected YYYY-MM');
  }

  try {
    const report = await getMonthlyPartnerReport(venueId, monthStr);
    return apiResponse.success(res, report);
  } catch (error: any) {
    console.error('Error generating partner monthly report:', error);
    return apiResponse.error(res, 500, 'Failed to generate report', error);
  }
});
