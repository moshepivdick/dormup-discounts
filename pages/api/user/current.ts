import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import { prisma } from '@/lib/prisma';
import { apiResponse } from '@/lib/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return apiResponse.error(res, 405, 'Method not allowed');
  }

  try {
    const supabase = createClientFromRequest(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return apiResponse.success(res, { user: null });
    }

    // Get profile with university info
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    return apiResponse.success(res, {
      user: {
        id: user.id,
        email: user.email || '',
        verifiedStudent: profile?.verifiedStudent || false,
        university: profile?.university
          ? {
              id: profile.university.id,
              name: profile.university.name,
              city: profile.university.city,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return apiResponse.error(res, 500, 'Unable to get user', error);
  }
}

