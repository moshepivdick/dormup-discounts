import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { venueMutationSchema } from '@/lib/validators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await auth.getAdminFromRequest(req);
  if (!admin) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (req.method === 'GET') {
    const venues = await prisma.venue.findMany();
    return apiResponse.success(res, { venues });
  }

  if (req.method === 'POST') {
    const parsed = venueMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
    }

    const venue = await prisma.venue.create({ data: parsed.data });
    return apiResponse.success(res, { venue }, 201);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return apiResponse.error(res, 405, 'Method not allowed');
}

