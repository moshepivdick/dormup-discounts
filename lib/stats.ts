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
  try {
    // Use explicit select to avoid avgStudentBill if migration not applied
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        discountUses: true,
      },
    });

    return venues.map((venue) => ({
      venueName: venue.name,
      total: venue.discountUses.length,
      confirmed: venue.discountUses.filter((d) => d.status === 'confirmed').length,
    }));
  } catch (error: any) {
    // Fallback to raw SQL if Prisma fails with P2022 (column not found)
    if (error?.code === 'P2022' && error?.meta?.column === 'Venue.avgStudentBill') {
      const rawData = await prisma.$queryRaw<Array<{
        venue_id: number;
        venue_name: string;
        total: bigint;
        confirmed: bigint;
      }>>`
        SELECT 
          v.id as venue_id,
          v.name as venue_name,
          COUNT(du.id) as total,
          COUNT(CASE WHEN du.status = 'confirmed' THEN 1 END) as confirmed
        FROM venues v
        LEFT JOIN discount_uses du ON v.id = du."venueId"
        GROUP BY v.id, v.name
        ORDER BY v.name ASC;
      `;

      return rawData.map((row) => ({
        venueName: row.venue_name,
        total: Number(row.total),
        confirmed: Number(row.confirmed),
      }));
    }
    throw error;
  }
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
    // Use explicit select to avoid querying dedupe_key if it doesn't exist
    // Select only fields that exist in the database
    const views = await prisma.venueView.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        venueId: true,
        city: true,
        createdAt: true,
        userAgent: true,
        user_id: true,
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
    // If any error occurs (dedupe_key column, table doesn't exist, etc.), 
    // try raw query with explicit fields excluding dedupe_key
    try {
      // Try without schema prefix first (some DBs might not need it)
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
        FROM venue_views v
        LEFT JOIN venues ven ON v.venue_id = ven.id
        WHERE v.user_id = ${userId}
        ORDER BY v.created_at DESC
      `;
      allViews = rawViews;
    } catch (rawError: any) {
      // If raw query also fails (table doesn't exist or other issue), 
      // return empty array as fallback to prevent complete failure
      console.error('Error fetching views - table may not exist:', rawError?.code, rawError?.message?.substring(0, 100));
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
    // Use explicit select to avoid querying dedupe_key if it doesn't exist
    // Select only fields that exist in the database
    const views = (await prisma.venueView.findMany({
      where: { venueId },
      select: {
        id: true,
        venueId: true,
        city: true,
        createdAt: true,
        userAgent: true,
        user_id: true,
        profiles: {
          select: {
            id: true,
            email: true,
            first_name: true,
          } as any,
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as ViewWithProfile[];
    allViews = views;
  } catch (error: any) {
    // If any error occurs (dedupe_key column, table doesn't exist, etc.), 
    // try raw query with explicit fields excluding dedupe_key
    try {
      // Try without schema prefix first (some DBs might not need it)
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
        FROM venue_views v
        LEFT JOIN profiles p ON v.user_id = p.id
        WHERE v.venue_id = ${venueId}
        ORDER BY v.created_at DESC
      `;
      allViews = rawViews;
    } catch (rawError: any) {
      // If raw query also fails (table doesn't exist or other issue), 
      // return empty array as fallback to prevent complete failure
      console.error('Error fetching views - table may not exist:', rawError?.code, rawError?.message?.substring(0, 100));
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
  const discountUses = (await prisma.discountUse.findMany({
    where: { venueId },
    include: {
      profiles: {
        select: {
          id: true,
          email: true,
          first_name: true,
        } as any,
      },
    },
    orderBy: { createdAt: 'desc' },
  })) as Array<{
    id: number;
    venueId: number;
    status: string;
    user_id: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
    profiles: { id: string; email: string; first_name: string | null } | null;
  }>;

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
  >((acc, use: any) => {
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

// Enhanced partner venue statistics with date range and computed metrics
export const getPartnerVenueStatsWithDateRange = async (
  venueId: number,
  startDate?: Date,
  endDate?: Date,
) => {
  // Build date filter
  const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (startDate) {
    dateFilter.createdAt = { gte: startDate };
  }
  if (endDate) {
    dateFilter.createdAt = {
      ...dateFilter.createdAt,
      lte: endDate,
    };
  }

  // Get views for this venue within date range
  type ViewWithProfile = {
    id: number;
    venueId: number;
    city: string;
    createdAt: Date;
    userAgent: string | null;
    user_id: string | null;
    profiles: {
      id: string;
      email: string;
      first_name: string | null;
      verified_student: boolean;
    } | null;
  };
  let allViews: ViewWithProfile[] = [];
  try {
    const views = (await prisma.venueView.findMany({
      where: {
        venueId,
        ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
      },
      select: {
        id: true,
        venueId: true,
        city: true,
        createdAt: true,
        userAgent: true,
        user_id: true,
        profiles: {
          select: {
            id: true,
            email: true,
            first_name: true,
            verified_student: true,
          } as any,
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as ViewWithProfile[];
    allViews = views;
  } catch (error: any) {
    try {
      const rawViews = await prisma.$queryRaw<ViewWithProfile[]>` 
        SELECT 
          v.id, v.venue_id as "venueId", v.city, v.created_at as "createdAt", 
          v.user_agent as "userAgent", v.user_id,
          CASE 
            WHEN p.id IS NOT NULL THEN
              json_build_object(
                'id', p.id,
                'email', p.email,
                'first_name', p.first_name,
                'verified_student', p.verified_student
              )
            ELSE NULL
          END as profiles
        FROM venue_views v
        LEFT JOIN profiles p ON v.user_id = p.id
        WHERE v.venue_id = ${venueId}
        ${startDate ? prisma.$queryRaw`AND v.created_at >= ${startDate}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND v.created_at <= ${endDate}` : prisma.$queryRaw``}
        ORDER BY v.created_at DESC
      `;
      allViews = rawViews;
    } catch (rawError: any) {
      console.error('Error fetching views:', rawError?.code, rawError?.message?.substring(0, 100));
      allViews = [];
    }
  }

  // Deduplicate views
  const viewsMap = new Map<string, typeof allViews[0]>();
  for (const view of allViews) {
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

  // Get discount uses for this venue within date range
  const discountUses = (await prisma.discountUse.findMany({
    where: {
      venueId,
      ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
    },
    include: {
      profiles: {
        select: {
          id: true,
          email: true,
          first_name: true,
          verified_student: true,
        } as any,
      },
    },
    orderBy: { createdAt: 'desc' },
  })) as Array<{
    id: number;
    venueId: number;
    status: string;
    user_id: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
    profiles: { id: string; email: string; first_name: string | null; verified_student: boolean } | null;
  }>;

  // Calculate metrics
  const pageViews = views.length;
  const uniqueStudents = new Set(views.map((v) => v.user_id).filter(Boolean)).size;
  const discountsRedeemed = discountUses.filter((d) => d.status === 'confirmed').length;
  
  // Verified student visits: count of confirmed discounts by verified students
  const verifiedStudentVisits = discountUses.filter(
    (d: any) => d.status === 'confirmed' && d.profiles?.verified_student === true
  ).length;

  // Returning students: users with >=2 confirmed discounts in range
  const userConfirmedCounts = discountUses
    .filter((d) => d.status === 'confirmed' && d.user_id)
    .reduce<Record<string, number>>((acc, use) => {
      acc[use.user_id!] = (acc[use.user_id!] || 0) + 1;
      return acc;
    }, {});
  const returningStudentsCount = Object.values(userConfirmedCounts).filter((count) => count >= 2).length;
  const newStudentsCount = uniqueStudents - returningStudentsCount;

  // Visits by day of week (0 = Sunday, 6 = Saturday)
  const visitsByDayOfWeek = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const dayViews = views.filter((v) => new Date(v.createdAt).getDay() === day);
    const dayConfirmed = discountUses.filter(
      (d) => d.status === 'confirmed' && new Date(d.confirmedAt || d.createdAt).getDay() === day
    );
    return {
      day,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      views: dayViews.length,
      confirmed: dayConfirmed.length,
    };
  });

  // Visits by time range
  const visitsByTimeRange = {
    lunch: discountUses.filter((d) => {
      if (d.status !== 'confirmed') return false;
      const hour = new Date(d.confirmedAt || d.createdAt).getHours();
      return hour >= 12 && hour < 15;
    }).length,
    dinner: discountUses.filter((d) => {
      if (d.status !== 'confirmed') return false;
      const hour = new Date(d.confirmedAt || d.createdAt).getHours();
      return hour >= 18 && hour < 22;
    }).length,
    other: discountUses.filter((d) => {
      if (d.status !== 'confirmed') return false;
      const hour = new Date(d.confirmedAt || d.createdAt).getHours();
      return !(hour >= 12 && hour < 15) && !(hour >= 18 && hour < 22);
    }).length,
  };

  // Conversion funnel
  const conversionRates = {
    viewsToStudents: uniqueStudents > 0 && pageViews > 0 
      ? Number(((uniqueStudents / pageViews) * 100).toFixed(1))
      : 0,
    studentsToDiscounts: uniqueStudents > 0 && discountsRedeemed > 0
      ? Number(((discountsRedeemed / uniqueStudents) * 100).toFixed(1))
      : 0,
    discountsToVerified: discountsRedeemed > 0 && verifiedStudentVisits > 0
      ? Number(((verifiedStudentVisits / discountsRedeemed) * 100).toFixed(1))
      : 0,
  };

  // Avg visits per student
  const totalConfirmedByUser = Object.values(userConfirmedCounts).reduce((sum, count) => sum + count, 0);
  const avgVisitsPerStudent = uniqueStudents > 0
    ? Number((totalConfirmedByUser / uniqueStudents).toFixed(1))
    : 0;

  return {
    // Main KPIs
    pageViews,
    uniqueStudents,
    discountsRedeemed,
    verifiedStudentVisits,
    returningStudentsCount,
    newStudentsCount,
    avgVisitsPerStudent,
    
    // Conversion funnel
    conversionRates,
    
    // Operational insights
    visitsByDayOfWeek,
    visitsByTimeRange,
    
    // Raw data for advanced panel
    recentViews: views.slice(0, 20),
    recentQrCodes: discountUses.slice(0, 20),
    userViewCounts: views.reduce<Record<string, number>>((acc, view) => {
      if (view.user_id) {
        acc[view.user_id] = (acc[view.user_id] || 0) + 1;
      }
      return acc;
    }, {}),
    userQrCounts: discountUses.reduce<
      Record<string, { generated: number; verified: number; email?: string; name?: string }>
    >((acc, use: any) => {
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
    }, {}),
    allDiscountUses: discountUses,
  };
};
