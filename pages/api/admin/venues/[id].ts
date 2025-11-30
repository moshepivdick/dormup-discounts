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

  const id = Number(req.query.id);
  if (Number.isNaN(id)) {
    return apiResponse.error(res, 400, 'Invalid id');
  }

  if (req.method === 'PUT') {
    const parsed = venueMutationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
    }
    const venue = await prisma.venue.update({
      where: { id },
      data: parsed.data,
    });
    return apiResponse.success(res, { venue });
  }

  if (req.method === 'DELETE') {
    await prisma.venue.delete({ where: { id } });
    return apiResponse.success(res, { deleted: true });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return apiResponse.error(res, 405, 'Method not allowed');
}

