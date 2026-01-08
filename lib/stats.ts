import { prisma } from '@/lib/prisma';

export const getOverviewStats = async () => {
  const [totalDiscounts, confirmedDiscounts, activeVenues, views] =
    await Promise.all([
      prisma.discountUse.count(),
      prisma.discountUse.count({ where: { status: 'confirmed' } }),
      prisma.venue.count({ where: { isActive: true } }),
      prisma.venueView.count(),
    ]);

  const conversionRate =
    views === 0 ? 0 : Number(((confirmedDiscounts / views) * 100).toFixed(1));

  return {
    totalDiscounts,
    confirmedDiscounts,
    activeVenues,
    views,
    conversionRate,
  };
};

export const getDiscountsByVenue = async () => {
  const venues = await prisma.venue.findMany({
    include: {
      discountUses: true,
    },
  });

  return venues.map((venue) => ({
    venueName: venue.name,
    total: venue.discountUses.length,
    confirmed: venue.discountUses.filter((d) => d.status === 'confirmed').length,
  }));
};

export const getDiscountsByDay = async (days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const uses = await prisma.discountUse.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const grouped = uses.reduce<Record<string, number>>((acc, use) => {
    const key = use.createdAt.toISOString().split('T')[0];
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, total]) => ({ date, total }));
};

// User activity statistics
export const getUserActivityStats = async (userId: string) => {
  // Get venue views
  // Handle case where dedupe_key column might not exist yet (before migration)
  type ViewWithVenue = {
    id: number;
    venueId: number;
    city: string;
    createdAt: Date;
    userAgent: string | null;
    user_id: string | null;
    venue: { id: number; name: string; city: string } | null;
  };
  let allViews: ViewWithVenue[] = [];
  try {
    const views = await prisma.venueView.findMany({
      where: { user_id: userId },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    allViews = views as ViewWithVenue[];
  } catch (error: any) {
    // If dedupe_key column doesn't exist, use raw query with explicit schema
    if (error?.code === 'P2022' || error?.meta?.column?.includes('dedupe_key')) {
      try {
        const rawViews = await prisma.$queryRaw<ViewWithVenue[]>`
          SELECT 
            v.id, v.venue_id as "venueId", v.city, v.created_at as "createdAt", 
            v.user_agent as "userAgent", v.user_id,
            CASE 
              WHEN ven.id IS NOT NULL THEN
                json_build_object(
                  'id', ven.id,
                  'name', ven.name,
                  'city', ven.city
                )
              ELSE NULL
            END as venue
          FROM public.venue_views v
          LEFT JOIN public.venues ven ON v.venue_id = ven.id
          WHERE v.user_id = ${userId}
          ORDER BY v.created_at DESC
        `;
        allViews = rawViews;
      } catch (rawError: any) {
        // If raw query also fails, return empty array as fallback
        console.error('Error fetching views with raw query:', rawError?.code, rawError?.message);
        allViews = [];
      }
    } else {
      // For any other error, log it but continue with empty array to prevent total failure
      console.error('Error fetching views:', error?.code, error?.message);
      allViews = [];
    }
  }

  // Deduplicate by dedupe_key if available, otherwise by user_id + venueId + minute bucket
  // This handles any legacy duplicates and works if dedupe_key column doesn't exist yet
  const viewsMap = new Map<string, typeof allViews[0]>();
  for (const view of allViews) {
    // Use dedupe_key if available, otherwise generate a key from existing fields
    const dedupeKey = (view as any).dedupe_key || (() => {
      const minuteBucket = new Date(view.createdAt);
      minuteBucket.setSeconds(0, 0);
      const userIdPart = view.user_id || 'anon';
      return `${view.venueId}:${userIdPart}:${minuteBucket.toISOString().slice(0, 16)}`;
    })();
    
    const existing = viewsMap.get(dedupeKey);
    if (!existing || new Date(view.createdAt) > new Date(existing.createdAt)) {
      viewsMap.set(dedupeKey, view);
    }
  }
  const views = Array.from(viewsMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get QR codes generated and verified
  const discountUses = await prisma.discountUse.findMany({
    where: { user_id: userId },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Count views per venue
  const venueViewCounts = views.reduce<Record<number, number>>((acc, view) => {
    acc[view.venueId] = (acc[view.venueId] || 0) + 1;
    return acc;
  }, {});

  // Count QR codes per venue
  const venueQrCounts = discountUses.reduce<Record<number, { generated: number; verified: number }>>(
    (acc, use) => {
      if (!acc[use.venueId]) {
        acc[use.venueId] = { generated: 0, verified: 0 };
      }
      acc[use.venueId].generated++;
      if (use.status === 'confirmed') {
        acc[use.venueId].verified++;
      }
      return acc;
    },
    {}
  );

  // Get first and return visits
  const firstVisits = new Set<number>();
  const returnVisits: Array<{ venueId: number; venueName: string; date: Date }> = [];

  views.forEach((view, index) => {
    const previousViews = views.slice(0, index).filter((v) => v.venueId === view.venueId);
    if (previousViews.length === 0) {
      firstVisits.add(view.venueId);
    } else {
      returnVisits.push({
        venueId: view.venueId,
        venueName: view.venue?.name || 'Unknown Venue',
        date: view.createdAt,
      });
    }
  });

  return {
    totalViews: views.length,
    totalQrCodes: discountUses.length,
    totalVerified: discountUses.filter((d) => d.status === 'confirmed').length,
    venueViewCounts,
    venueQrCounts,
    firstVisits: Array.from(firstVisits),
    returnVisits,
    recentViews: views.slice(0, 10),
    recentQrCodes: discountUses.slice(0, 10),
  };
};

// Partner venue statistics (only their venue)
export const getPartnerVenueStats = async (venueId: number) => {
  // Get all views for this venue
  // Handle case where dedupe_key column might not exist yet (before migration)
  type ViewWithProfile = {
    id: number;
    venueId: number;
    city: string;
    createdAt: Date;
    userAgent: string | null;
    user_id: string | null;
    profiles: { id: string; email: string; first_name: string | null } | null;
  };
  let allViews: ViewWithProfile[] = [];
  try {
    const views = await prisma.venueView.findMany({
      where: { venueId },
      include: {
        profiles: {
          select: {
            id: true,
            email: true,
            first_name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    allViews = views as ViewWithProfile[];
  } catch (error: any) {
    // If dedupe_key column doesn't exist (P2022), use raw query with explicit schema
    if (error?.code === 'P2022' || error?.meta?.column?.includes('dedupe_key')) {
      try {
        // Use Prisma.sql template with explicit schema name
        const rawViews = await prisma.$queryRaw<ViewWithProfile[]>`
          SELECT 
            v.id, v.venue_id as "venueId", v.city, v.created_at as "createdAt", 
            v.user_agent as "userAgent", v.user_id,
            CASE 
              WHEN p.id IS NOT NULL THEN
                json_build_object(
                  'id', p.id,
                  'email', p.email,
                  'first_name', p.first_name
                )
              ELSE NULL
            END as profiles
          FROM public.venue_views v
          LEFT JOIN public.profiles p ON v.user_id = p.id
          WHERE v.venue_id = ${venueId}
          ORDER BY v.created_at DESC
        `;
      } catch (rawError: any) {
        // If raw query also fails (table doesn't exist or other issue), 
        // return empty array as fallback to prevent complete failure
        console.error('Error fetching views with raw query:', rawError?.code, rawError?.message);
        allViews = [];
      }
    } else {
      // For any other error, log it but continue with empty array to prevent total failure
      console.error('Error fetching views:', error?.code, error?.message);
      allViews = [];
    }
  }

  // Deduplicate by dedupe_key if available, otherwise by user_id + venueId + minute bucket
  // This handles any legacy duplicates that might exist before the unique constraint was added
  // Also works if dedupe_key column doesn't exist yet (before migration)
  const viewsMap = new Map<string, typeof allViews[0]>();
  for (const view of allViews) {
    // Use dedupe_key if available, otherwise generate a key from existing fields
    const dedupeKey = (view as any).dedupe_key || (() => {
      const minuteBucket = new Date(view.createdAt);
      minuteBucket.setSeconds(0, 0);
      const userIdPart = view.user_id || 'anon';
      return `${view.venueId}:${userIdPart}:${minuteBucket.toISOString().slice(0, 16)}`;
    })();
    
    const existing = viewsMap.get(dedupeKey);
    if (!existing || new Date(view.createdAt) > new Date(existing.createdAt)) {
      viewsMap.set(dedupeKey, view);
    }
  }
  // Convert back to array, sorted by createdAt descending
  const views = Array.from(viewsMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get all QR codes for this venue
  const discountUses = await prisma.discountUse.findMany({
    where: { venueId },
    include: {
      profiles: {
        select: {
          id: true,
          email: true,
          first_name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Count views per user
  const userViewCounts = views.reduce<Record<string, number>>((acc, view) => {
    if (view.user_id) {
      acc[view.user_id] = (acc[view.user_id] || 0) + 1;
    }
    return acc;
  }, {});

  // Count QR codes per user
  const userQrCounts = discountUses.reduce<
    Record<string, { generated: number; verified: number; email?: string; name?: string }>
  >((acc, use) => {
    if (use.user_id) {
      if (!acc[use.user_id]) {
        acc[use.user_id] = {
          generated: 0,
          verified: 0,
          email: use.profiles?.email,
          name: use.profiles?.first_name || undefined,
        };
      }
      acc[use.user_id].generated++;
      if (use.status === 'confirmed') {
        acc[use.user_id].verified++;
      }
    }
    return acc;
  }, {});

  return {
    totalViews: views.length,
    totalQrCodes: discountUses.length,
    totalVerified: discountUses.filter((d) => d.status === 'confirmed').length,
    uniqueUsers: new Set(views.map((v) => v.user_id).filter(Boolean)).size,
    userViewCounts,
    userQrCounts,
    recentViews: views.slice(0, 20),
    recentQrCodes: discountUses.slice(0, 20),
  };
};

