import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { venueMutationSchema } from '@/lib/validators';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import { mapLegacyCategory, isValidCategory } from '@/lib/constants/categories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Try cookie-based admin first (Pages Router)
  let admin = await auth.getAdminFromRequest(req);
  let isSupabaseAdmin = false;
  
  // If no admin from cookies, try Supabase auth (App Router)
  if (!admin) {
    try {
      const supabase = createClientFromRequest(req);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && user) {
        // Check if user is admin in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profile?.is_admin) {
          isSupabaseAdmin = true;
        }
      }
    } catch (error) {
      // Supabase auth failed, continue with cookie check
      console.error('Supabase auth check failed:', error);
    }
  }
  
  if (!admin && !isSupabaseAdmin) {
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
          priceLevel: true,
          typicalStudentSpendMin: true,
          typicalStudentSpendMax: true,
          subscriptionTier: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
      });
      // Defensive: normalize categories in case of legacy data
      const normalizedVenues = venues.map((v) => ({
        ...v,
        category: isValidCategory(v.category) ? v.category : mapLegacyCategory(v.category),
      }));
      return apiResponse.success(res, { venues: normalizedVenues });
    } catch (error: any) {
      // Fallback to raw SQL if Prisma fails with P2022 (column not found)
      const isColumnError = 
        error?.code === 'P2022' || 
        error?.message?.includes('priceLevel') ||
        error?.message?.includes('typicalStudentSpend') ||
        error?.message?.includes('avgStudentBill');
      
      if (isColumnError) {
        console.error('Prisma error, using fallback without price fields:', error);
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
          FROM "Venue"
          ORDER BY city ASC, name ASC;
        `;
        return apiResponse.success(res, {
          venues: rawVenues.map((v) => ({
            ...v,
            category: isValidCategory(v.category) ? v.category : mapLegacyCategory(v.category),
            priceLevel: null,
            typicalStudentSpendMin: null,
            typicalStudentSpendMax: null,
            subscriptionTier: 'BASIC',
          })),
        });
      }
      console.error('Error fetching venues:', error);
      // Return empty array instead of throwing to prevent page crash
      return apiResponse.success(res, { venues: [] });
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

