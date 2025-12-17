import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import { apiResponse } from '@/lib/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return apiResponse.error(res, 405, 'Method not allowed');
  }

  try {
    const supabase = createClientFromRequest(req);
    await supabase.auth.signOut();

    // Clear the session cookie
    res.setHeader(
      'Set-Cookie',
      'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    );
    res.setHeader(
      'Set-Cookie',
      'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    );

    return apiResponse.success(res, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return apiResponse.error(res, 500, 'Unable to logout', error);
  }
}

