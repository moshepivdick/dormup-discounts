import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { getUserStats, getUserActivity } from '@/lib/stats';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  const currentUser = await auth.getUserFromRequest(req);
  
  if (!currentUser) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  try {
    const stats = await getUserStats(currentUser.id);
    const activity = await getUserActivity(currentUser.id, 5); // Get last 5 activities

    return apiResponse.success(res, {
      stats,
      recentActivity: activity,
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    return apiResponse.error(res, 500, 'Failed to get user statistics');
  }
});

