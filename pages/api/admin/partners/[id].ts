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

  const id = req.query.id as string;
  if (!id) {
    return apiResponse.error(res, 400, 'Invalid id');
  }

  if (req.method === 'PUT') {
    const parsed = partnerMutationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {
      email: data.email,
      venueId: data.venueId,
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: updateData,
    });
    return apiResponse.success(res, { partner });
  }

  if (req.method === 'DELETE') {
    await prisma.partner.delete({ where: { id } });
    return apiResponse.success(res, { deleted: true });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return apiResponse.error(res, 405, 'Method not allowed');
}

