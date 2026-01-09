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
    try {
      // Use explicit select to avoid avgStudentBill if migration not applied
      const venues = await prisma.venue.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
          discountText: true,
          isActive: true,
          details: true,
          openingHours: true,
          openingHoursShort: true,
          mapUrl: true,
          latitude: true,
          longitude: true,
          imageUrl: true,
          thumbnailUrl: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
      });
      return apiResponse.success(res, { venues });
    } catch (error: any) {
      // Fallback to raw SQL if Prisma fails with P2022 (column not found)
      if (error?.code === 'P2022' && error?.meta?.column === 'Venue.avgStudentBill') {
        const rawVenues = await prisma.$queryRaw<Array<{
          id: number;
          name: string;
          city: string;
          category: string;
          discountText: string;
          isActive: boolean;
          details: string | null;
          openingHours: string | null;
          openingHoursShort: string | null;
          mapUrl: string | null;
          latitude: number;
          longitude: number;
          imageUrl: string | null;
          thumbnailUrl: string | null;
          phone: string | null;
          createdAt: Date;
          updatedAt: Date;
        }>>`
          SELECT id, name, city, category, "discountText", "isActive", details, "openingHours", "openingHoursShort", "mapUrl", latitude, longitude, "imageUrl", "thumbnailUrl", phone, "createdAt", "updatedAt"
          FROM public.venues
          ORDER BY city ASC, name ASC;
        `;
        return apiResponse.success(res, { venues: rawVenues });
      }
      throw error;
    }
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

