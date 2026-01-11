import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { getMonthlyAdminReport, parseMonth } from '@/lib/reports';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin
  const admin = await auth.getAdminFromRequest(req);
  if (!admin) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  // Get month parameter
  const month = req.query.month as string;
  if (!month) {
    // Default to current month
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;
    const defaultMonth = `${year}-${String(monthNum).padStart(2, '0')}`;
    return apiResponse.success(res, await getMonthlyAdminReport(defaultMonth));
  }

  // Validate month format
  try {
    parseMonth(month);
  } catch (error: any) {
    return apiResponse.error(res, 400, error.message || 'Invalid month format. Expected YYYY-MM');
  }

  try {
    const report = await getMonthlyAdminReport(month);
    return apiResponse.success(res, report);
  } catch (error: any) {
    console.error('Error generating admin monthly report:', error);
    return apiResponse.error(res, 500, 'Failed to generate report', error);
  }
});
