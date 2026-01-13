import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { apiResponse, withMethods } from '@/lib/api';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Try to fetch venues - use explicit select to avoid avgStudentBill field until migration is applied
    let venues;
    try {
      // Try to fetch with price fields, but handle gracefully if they don't exist
      venues = await prisma.venue.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
          discountText: true,
          isActive: true,
          imageUrl: true,
          thumbnailUrl: true,
          openingHoursShort: true,
          latitude: true,
          longitude: true,
          // Price fields - will be null if columns don't exist
          priceLevel: true,
          typicalStudentSpendMin: true,
          typicalStudentSpendMax: true,
          // Explicitly exclude avgStudentBill to avoid P2022 error if column doesn't exist
        },
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
      });
    } catch (prismaError: any) {
      console.error('Prisma error fetching venues:', prismaError);
      // If error is about missing column (P2022), use raw SQL
      const isColumnError = 
        prismaError?.code === 'P2022' || 
        prismaError?.message?.includes('avgStudentBill') || 
        prismaError?.message?.includes('avg_student_bill') ||
        prismaError?.message?.includes('priceLevel') ||
        prismaError?.message?.includes('price_level') ||
        prismaError?.message?.includes('typicalStudentSpend') ||
        prismaError?.message?.includes('typical_student_spend');
      
      if (isColumnError) {
        console.log('Column error detected, using raw SQL query without price fields...');
        // Use raw SQL without price fields since they don't exist yet
        venues = await (prisma as any).$queryRaw`
          SELECT id, name, city, category, "discountText", "isActive", 
                 "imageUrl", "thumbnailUrl", "openingHoursShort", 
                 latitude, longitude
          FROM "Venue"
          WHERE "isActive" = true
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
          priceLevel: null,
          typicalStudentSpendMin: null,
          typicalStudentSpendMax: null,
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

