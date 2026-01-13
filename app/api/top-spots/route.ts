import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export type TopSpot = {
  placeId: number;
  name: string;
  coverImage: string | null;
  visitsCount: number;
  lastVisitAt: string;
};

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch top 3 places for the user, sorted by visits_count desc, then last_visit_at desc
    const topSpots = await prisma.userPlaceStats.findMany({
      where: {
        user_id: user.id,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: [
        { visits_count: 'desc' },
        { last_visit_at: 'desc' },
      ],
      take: 3,
    });

    // Transform to the expected format
    const result: TopSpot[] = topSpots.map((stat) => ({
      placeId: stat.place_id,
      name: stat.venue.name,
      coverImage: stat.venue.imageUrl || stat.venue.thumbnailUrl || null,
      visitsCount: stat.visits_count,
      lastVisitAt: stat.last_visit_at.toISOString(),
    }));

    return NextResponse.json({ topSpots: result });
  } catch (error) {
    console.error('Error fetching top spots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top spots' },
      { status: 500 }
    );
  }
}
