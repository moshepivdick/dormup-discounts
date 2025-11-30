import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { partnerMutationSchema } from '@/lib/validators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await auth.getAdminFromRequest(req);
  if (!admin) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (req.method === 'GET') {
    const partners = await prisma.partner.findMany({ include: { venue: true } });
    return apiResponse.success(res, { partners });
  }

  if (req.method === 'POST') {
    const parsed = partnerMutationSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
    }
    if (!parsed.data.password) {
      return apiResponse.error(res, 400, 'Password is required');
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const partner = await prisma.partner.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        venueId: parsed.data.venueId,
      },
    });

    return apiResponse.success(res, { partner }, 201);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return apiResponse.error(res, 405, 'Method not allowed');
}

