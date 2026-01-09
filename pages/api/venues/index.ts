import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Try to fetch venues - show all to restore them
    let venues;
    try {
      venues = await prisma.venue.findMany({
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
      });
    } catch (prismaError: any) {
      console.error('Prisma error fetching venues:', prismaError);
      // If error is about missing column, try selecting only known fields
      if (prismaError?.message?.includes('avg_student_bill') || prismaError?.code === 'P2021') {
        console.log('Attempting to fetch venues without avgStudentBill field...');
        // Try with explicit select to avoid new field issues
        venues = await (prisma as any).$queryRaw`
          SELECT id, name, city, category, "discountText", "isActive", 
                 "imageUrl", "thumbnailUrl", "openingHoursShort", 
                 latitude, longitude
          FROM venues
          ORDER BY city ASC, name ASC
        `;
        // Convert raw results to match expected format
        venues = venues.map((v: any) => ({
          id: Number(v.id),
          name: v.name,
          city: v.city,
          category: v.category,
          discountText: v.discountText,
          isActive: v.isActive ?? true,
          imageUrl: v.imageUrl,
          thumbnailUrl: v.thumbnailUrl,
          openingHoursShort: v.openingHoursShort,
          latitude: Number(v.latitude),
          longitude: Number(v.longitude),
        }));
      } else {
        throw prismaError;
      }
    }

    console.log(`Successfully loaded ${venues.length} venues via API`);

    return apiResponse.success(res, { venues });
  } catch (error: any) {
    console.error('Error loading venues:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
    });
    return apiResponse.error(res, 500, 'Unable to load venues', error);
  }
});

