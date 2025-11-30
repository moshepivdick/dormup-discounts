import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';

export default withMethods(['POST'], (req: NextApiRequest, res: NextApiResponse) => {
  auth.clearPartnerCookie(res);
  return apiResponse.success(res, { message: 'Logged out' });
});

