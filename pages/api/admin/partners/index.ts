import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/api';
import { partnerMutationSchema } from '@/lib/validators';
import { createClientFromRequest } from '@/lib/supabase/pages-router';

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
      const partners = await prisma.partner.findMany({
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              city: true,
              category: true,
              discountText: true,
              details: true,
              openingHours: true,
              openingHoursShort: true,
              mapUrl: true,
              latitude: true,
              longitude: true,
              imageUrl: true,
              thumbnailUrl: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              phone: true,
              // Explicitly exclude avgStudentBill to avoid P2022 error if column doesn't exist
            },
          },
        },
      });
      // Transform partners data to match expected format
      const transformedPartners = partners.map((p: any) => ({
        id: p.id,
        email: p.email,
        venueName: p.venue?.name || 'No venue',
      }));
      return apiResponse.success(res, { partners: transformedPartners });
    } catch (error: any) {
      if (error?.code === 'P2022' || error?.message?.includes('avgStudentBill')) {
        console.error('Prisma error, using fallback:', error);
        const rawPartners = await (prisma as any).$queryRaw<Array<{
          id: string;
          email: string;
          venueName: string | null;
        }>>`
          SELECT p.id, p.email, v.name as "venueName"
          FROM partners p
          LEFT JOIN venues v ON p."venueId" = v.id
        `;
        const transformedPartners = rawPartners.map((p: { id: string; email: string; venueName: string | null }) => ({
          id: p.id,
          email: p.email,
          venueName: p.venueName || 'No venue',
        }));
        return apiResponse.success(res, { partners: transformedPartners });
      }
      console.error('Error fetching partners:', error);
      // Return empty array instead of throwing to prevent page crash
      return apiResponse.success(res, { partners: [] });
    }
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

