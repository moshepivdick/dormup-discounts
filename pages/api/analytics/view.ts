import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';
import { venueViewSchema } from '@/lib/validators';
import { auth } from '@/lib/auth';

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  const parsed = venueViewSchema.safeParse({
    ...req.body,
    userAgent: req.headers['user-agent'],
  });

  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Invalid payload');
  }

  const { venueId, city, userAgent } = parsed.data;

  // Get current user (optional - can be null for anonymous users)
  const currentUser = await auth.getUserFromRequest(req);

  await prisma.venueView.create({
    data: { 
      venueId, 
      city, 
      userAgent,
      userId: currentUser?.id || null,
    },
  });

  return apiResponse.success(res, { ok: true });
});

