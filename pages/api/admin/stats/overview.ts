import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { getOverviewStats } from '@/lib/stats';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await auth.getAdminFromRequest(req);
  if (!admin) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return apiResponse.error(res, 405, 'Method not allowed');
  }

  const overview = await getOverviewStats();
  return apiResponse.success(res, { overview });
}

