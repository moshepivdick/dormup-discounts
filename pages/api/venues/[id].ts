import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  const id = Number(req.query.id);
  if (Number.isNaN(id)) {
    return apiResponse.error(res, 400, 'Invalid venue id');
  }

  try {
    // Use explicit select to avoid avgStudentBill if migration not applied
    const venue = await prisma.venue.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        city: true,
        category: true,
        discountText: true,
        isActive: true,
        details: true,
        openingHours: true,
        priceLevel: true,
        typicalStudentSpendMin: true,
        typicalStudentSpendMax: true,
        openingHoursShort: true,
        mapUrl: true,
        imageUrl: true,
        thumbnailUrl: true,
        latitude: true,
        longitude: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!venue || !venue.isActive) {
      return apiResponse.error(res, 404, 'Venue not found');
    }
    return apiResponse.success(res, { venue });
  } catch (error: any) {
    // Fallback to raw SQL if Prisma fails with P2022 (column not found)
    const isColumnError = 
      error?.code === 'P2022' || 
      error?.message?.includes('avgStudentBill') ||
      error?.message?.includes('priceLevel') ||
      error?.message?.includes('typicalStudentSpend');
    
    if (isColumnError) {
      try {
        // Query without price fields since they don't exist yet
        const rawVenue = await prisma.$queryRaw<Array<{
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
          imageUrl: string | null;
          thumbnailUrl: string | null;
          latitude: number;
          longitude: number;
          phone: string | null;
          createdAt: Date;
          updatedAt: Date;
        }>>`
          SELECT id, name, city, category, "discountText", "isActive", details, "openingHours", "openingHoursShort", "mapUrl", "imageUrl", "thumbnailUrl", latitude, longitude, phone, "createdAt", "updatedAt"
          FROM "Venue"
          WHERE id = ${id} AND "isActive" = true;
        `;

        if (!rawVenue || rawVenue.length === 0) {
          return apiResponse.error(res, 404, 'Venue not found');
        }

        const venue = rawVenue[0];
        return apiResponse.success(res, {
          venue: {
            ...venue,
            priceLevel: (venue as any).priceLevel || null,
            typicalStudentSpendMin: (venue as any).typicalStudentSpendMin ? Number((venue as any).typicalStudentSpendMin) : null,
            typicalStudentSpendMax: (venue as any).typicalStudentSpendMax ? Number((venue as any).typicalStudentSpendMax) : null,
          },
        });
      } catch (fallbackError) {
        console.error('Error fetching venue with fallback:', fallbackError);
        return apiResponse.error(res, 500, 'Unable to load venue', fallbackError);
      }
    }
    return apiResponse.error(res, 500, 'Unable to load venue', error);
  }
});

