import { prisma } from '@/lib/prisma';

export const getOverviewStats = async () => {
  try {
    const [totalDiscounts, confirmedDiscounts, activeVenues, views] =
      await Promise.all([
        prisma.discountUse.count(),
        prisma.discountUse.count({ where: { status: 'confirmed' } }),
        prisma.venue.count({ where: { isActive: true } }),
        prisma.venueView.count(),
      ]);

    // Fixed: Conversion rate = confirmed / generated (not views)
    const conversionRate =
      totalDiscounts === 0 ? 0 : Number(((confirmedDiscounts / totalDiscounts) * 100).toFixed(1));

    return {
      totalDiscounts,
      confirmedDiscounts,
      activeVenues,
      views,
      conversionRate,
    };
  } catch (error: any) {
    console.error('Error in getOverviewStats:', error);
    // Return default values instead of throwing to prevent dashboard crash
    return {
      totalDiscounts: 0,
      confirmedDiscounts: 0,
      activeVenues: 0,
      views: 0,
      conversionRate: 0,
    };
  }
};

export const getDiscountsByVenue = async () => {
  try {
    // Use raw SQL to avoid relation issues and avgStudentBill problems
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
      FROM "public"."Venue" v
      LEFT JOIN "public"."DiscountUse" du ON v.id = du."venueId"
      WHERE v."isActive" = true
      GROUP BY v.id, v.name
      ORDER BY v.name ASC;
    `;

    return rawData.map((row) => ({
      venueName: row.venue_name,
      total: Number(row.total),
      confirmed: Number(row.confirmed),
    }));
  } catch (error: any) {
    console.error('Error in getDiscountsByVenue:', error);
    // Return empty array instead of throwing to prevent dashboard crash
    return [];
  }
};

export const getDiscountsByDay = async (days = 7) => {
  try {
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
  } catch (error: any) {
    console.error('Error in getDiscountsByDay:', error);
    // Return empty array instead of throwing to prevent dashboard crash
    return [];
  }
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
          v.id, v."venueId", v.city, v."createdAt", 
          v."userAgent", v."user_id",
          CASE 
            WHEN ven.id IS NOT NULL THEN
              json_build_object(
                'id', ven.id,
                'name', ven.name,
                'city', ven.city
              )
            ELSE NULL
          END as venue
        FROM "public"."VenueView" v
        LEFT JOIN "public"."Venue" ven ON v."venueId" = ven.id
        WHERE v."user_id" = ${userId}
        ORDER BY v."createdAt" DESC
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

  // Get first and return visits based on confirmed scans (not just views)
  const firstVisits = new Set<number>();
  const returnVisits: Array<{ venueId: number; venueName: string; date: Date }> = [];
  const confirmedUses = discountUses
    .filter((use) => use.status === 'confirmed')
    .map((use) => ({
      ...use,
      scanAt: use.confirmedAt ?? use.createdAt,
    }))
    .sort((a, b) => a.scanAt.getTime() - b.scanAt.getTime());

  const seenVenues = new Set<number>();
  for (const use of confirmedUses) {
    if (!seenVenues.has(use.venueId)) {
      seenVenues.add(use.venueId);
      firstVisits.add(use.venueId);
    } else {
      returnVisits.push({
        venueId: use.venueId,
        venueName: use.venue?.name || 'Unknown Venue',
        date: use.scanAt,
      });
    }
  }

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
          v.id, v."venueId", v.city, v."createdAt", 
          v."userAgent", v."user_id",
          CASE 
            WHEN p.id IS NOT NULL THEN
              json_build_object(
                'id', p.id,
                'email', p.email,
                'first_name', p."first_name"
              )
            ELSE NULL
          END as profiles
        FROM "public"."VenueView" v
        LEFT JOIN "public"."Profile" p ON v."user_id" = p.id
        WHERE v."venueId" = ${venueId}
        ORDER BY v."createdAt" DESC
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
          v.id, v."venueId", v.city, v."createdAt", 
          v."userAgent", v."user_id",
          CASE 
            WHEN p.id IS NOT NULL THEN
              json_build_object(
                'id', p.id,
                'email', p.email,
                'first_name', p."first_name",
                'verified_student', p."verified_student"
              )
            ELSE NULL
          END as profiles
        FROM "public"."VenueView" v
        LEFT JOIN "public"."Profile" p ON v."user_id" = p.id
        WHERE v."venueId" = ${venueId}
        ${startDate ? prisma.$queryRaw`AND v."createdAt" >= ${startDate}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND v."createdAt" <= ${endDate}` : prisma.$queryRaw``}
        ORDER BY v."createdAt" DESC
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

  const confirmedUsesInRange = discountUses.filter(
    (use) => use.status === 'confirmed' && use.user_id,
  );
  const confirmedCountsByUser = confirmedUsesInRange.reduce<Record<string, number>>((acc, use) => {
    acc[use.user_id!] = (acc[use.user_id!] || 0) + 1;
    return acc;
  }, {});
  const uniqueConfirmedUsers = new Set(confirmedUsesInRange.map((use) => use.user_id)).size;

  // Calculate metrics
  const pageViews = views.length;
  const uniqueStudents = new Set(views.map((v) => v.user_id).filter(Boolean)).size;
  const discountsRedeemed = discountUses.filter((d) => d.status === 'confirmed').length;
  
  // Verified student visits: count of confirmed discounts by verified students
  const verifiedStudentVisits = discountUses.filter(
    (d: any) => d.status === 'confirmed' && d.profiles?.verified_student === true
  ).length;

  // Returning students: users with 2+ confirmed scans in range
  const returningStudentsCount = Object.values(confirmedCountsByUser).filter((count) => count >= 2).length;
  const newStudentsCount = Math.max(0, uniqueConfirmedUsers - returningStudentsCount);

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
  const totalConfirmedByUser = Object.values(confirmedCountsByUser).reduce((sum, count) => sum + count, 0);
  const avgVisitsPerStudent = uniqueConfirmedUsers > 0
    ? Number((totalConfirmedByUser / uniqueConfirmedUsers).toFixed(1))
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

// User Activity Overview - Founder-level metrics
export const getUserActivityOverview = async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Optimized: Fetch all data in sequence to avoid connection pool exhaustion
    // Get all views from month start (we'll filter by date in memory)
    const allViews = await prisma.venueView.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { user_id: true, createdAt: true },
    });

    // Get all discount uses from month start
    const allDiscountUses = await prisma.discountUse.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { user_id: true, createdAt: true, status: true, confirmedAt: true },
    });

  // Filter in memory by date ranges
  const viewsToday = allViews.filter(v => v.createdAt >= todayStart);
  const viewsWeek = allViews.filter(v => v.createdAt >= weekStart);
  const viewsMonth = allViews;

  const qrToday = allDiscountUses.filter(q => q.createdAt >= todayStart);
  const qrWeek = allDiscountUses.filter(q => q.createdAt >= weekStart);
  const qrMonth = allDiscountUses;

  const confirmedToday = allDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt && c.confirmedAt >= todayStart);
  const confirmedWeek = allDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt && c.confirmedAt >= weekStart);
  const confirmedMonth = allDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt && c.confirmedAt >= monthStart);

  // Combine all activities and get unique users per period
  const activeUsersToday = new Set<string>();
  viewsToday.forEach(v => v.user_id && activeUsersToday.add(v.user_id));
  qrToday.forEach(q => q.user_id && activeUsersToday.add(q.user_id));
  confirmedToday.forEach(c => c.user_id && activeUsersToday.add(c.user_id));

  const activeUsersWeek = new Set<string>();
  viewsWeek.forEach(v => v.user_id && activeUsersWeek.add(v.user_id));
  qrWeek.forEach(q => q.user_id && activeUsersWeek.add(q.user_id));
  confirmedWeek.forEach(c => c.user_id && activeUsersWeek.add(c.user_id));

  const activeUsersMonth = new Set<string>();
  viewsMonth.forEach(v => v.user_id && activeUsersMonth.add(v.user_id));
  qrMonth.forEach(q => q.user_id && activeUsersMonth.add(q.user_id));
  confirmedMonth.forEach(c => c.user_id && activeUsersMonth.add(c.user_id));

  const dau = activeUsersToday.size;
  const wau = activeUsersWeek.size;
  const mau = activeUsersMonth.size;

  // New users (created profile in period) - fetch from week start to cover both periods
  const newUsersWeekData = await prisma.profile.findMany({
    where: { createdAt: { gte: weekStart } },
    select: { createdAt: true },
  });
  const newUsersToday = newUsersWeekData.filter(p => p.createdAt >= todayStart).length;
  const newUsersWeek = newUsersWeekData.length;

  // Returning users percentage (users active in last 7 days who were also active in previous 7 days)
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  
  // Use already fetched data for current week, fetch previous week data separately
  const previousWeekViews = await prisma.venueView.findMany({
    where: { createdAt: { gte: previousWeekStart, lt: weekStart }, user_id: { not: null } },
    select: { user_id: true },
  });
  const previousWeekQr = await prisma.discountUse.findMany({
    where: { createdAt: { gte: previousWeekStart, lt: weekStart }, user_id: { not: null } },
    select: { user_id: true },
  });
  const previousWeekConfirmed = await prisma.discountUse.findMany({
    where: { status: 'confirmed', confirmedAt: { gte: previousWeekStart, lt: weekStart }, user_id: { not: null } },
    select: { user_id: true },
  });

  // Use already fetched current week data
  const currentWeekViews = viewsWeek.filter(v => v.user_id !== null);
  const currentWeekQr = qrWeek.filter(q => q.user_id !== null);
  const currentWeekConfirmed = confirmedWeek.filter(c => c.user_id !== null);

  const currentWeekUserIds = new Set<string>();
  currentWeekViews.forEach(v => v.user_id && currentWeekUserIds.add(v.user_id));
  currentWeekQr.forEach(q => q.user_id && currentWeekUserIds.add(q.user_id));
  currentWeekConfirmed.forEach(c => c.user_id && currentWeekUserIds.add(c.user_id));

  const previousWeekUserIds = new Set<string>();
  previousWeekViews.forEach(v => v.user_id && previousWeekUserIds.add(v.user_id));
  previousWeekQr.forEach(q => q.user_id && previousWeekUserIds.add(q.user_id));
  previousWeekConfirmed.forEach(c => c.user_id && previousWeekUserIds.add(c.user_id));

  const returningUsers = Array.from(currentWeekUserIds).filter(id => previousWeekUserIds.has(id)).length;
  const returningPercentage = currentWeekUserIds.size === 0 ? 0 : 
    Number(((returningUsers / currentWeekUserIds.size) * 100).toFixed(1));

  // Average discounts per user (7-day window)
  const totalDiscounts7d = qrWeek.length;
  const avgDiscountsPerUser = activeUsersWeek.size === 0 ? 0 :
    Number((totalDiscounts7d / activeUsersWeek.size).toFixed(2));

    return {
      dau,
      wau,
      mau,
      newUsersToday,
      newUsersWeek,
      returningPercentage,
      avgDiscountsPerUser,
    };
  } catch (error: any) {
    console.error('Error in getUserActivityOverview:', error);
    // Return default values instead of throwing to prevent dashboard crash
    return {
      dau: 0,
      wau: 0,
      mau: 0,
      newUsersToday: 0,
      newUsersWeek: 0,
      returningPercentage: 0,
      avgDiscountsPerUser: 0,
    };
  }
};

// Micro-insights: peak activity time, most active day, top cohort
export const getMicroInsights = async () => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Get all activities in last 7 days - sequential to avoid connection pool issues
    const views = await prisma.venueView.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { createdAt: true },
    });
    
    const allDiscountUses = await prisma.discountUse.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { createdAt: true, status: true, confirmedAt: true },
    });
  
  const qrCodes = allDiscountUses;
  const confirmed = allDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt);

  // Combine all activities with timestamps
  const allActivities: Date[] = [
    ...views.map(v => v.createdAt),
    ...qrCodes.map(q => q.createdAt),
    ...confirmed.map(c => c.confirmedAt).filter((date): date is Date => date !== null),
  ];

  if (allActivities.length === 0) {
    return {
      peakActivityTime: 'N/A',
      mostActiveDay: 'N/A',
      topCohort: 'N/A',
    };
  }

  // Peak activity time (hour range)
  const hourCounts: Record<number, number> = {};
  allActivities.forEach(activity => {
    const hour = activity.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts)
    .map(([h, count]) => ({ hour: parseInt(h), count }))
    .sort((a, b) => b.count - a.count);

  let peakStartHour = sortedHours[0]?.hour ?? 0;
  let peakEndHour = peakStartHour;
  let peakCount = sortedHours[0]?.count ?? 0;

  // Find consecutive hours with high activity (within 80% of peak)
  const threshold = peakCount * 0.8;
  for (let i = peakStartHour; i < 24; i++) {
    if ((hourCounts[i] || 0) >= threshold) {
      peakEndHour = i;
    } else {
      break;
    }
  }

  const peakActivityTime = `${peakStartHour.toString().padStart(2, '0')}:00–${(peakEndHour + 1).toString().padStart(2, '0')}:00`;

  // Most active day of week
  const dayCounts: Record<number, number> = {};
  allActivities.forEach(activity => {
    const day = activity.getDay(); // 0 = Sunday, 6 = Saturday
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mostActiveDayNum = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  const mostActiveDay = mostActiveDayNum !== undefined ? dayNames[parseInt(mostActiveDayNum)] : 'N/A';

  // Top cohort (verified vs non-verified users) - sequential to avoid connection pool issues
  const verifiedUsers = await prisma.profile.count({
    where: {
      verified_student: true,
      DiscountUse: {
        some: {
          createdAt: { gte: weekStart },
        },
      },
    },
  });

  const nonVerifiedUsers = await prisma.profile.count({
    where: {
      verified_student: false,
      DiscountUse: {
        some: {
          createdAt: { gte: weekStart },
        },
      },
    },
  });

  const topCohort = verifiedUsers > nonVerifiedUsers ? 'Verified students' : 
    nonVerifiedUsers > verifiedUsers ? 'Non-verified users' : 'Equal';

    return {
      peakActivityTime,
      mostActiveDay,
      topCohort,
    };
  } catch (error: any) {
    console.error('Error in getMicroInsights:', error);
    // Return default values instead of throwing to prevent dashboard crash
    return {
      peakActivityTime: 'N/A',
      mostActiveDay: 'N/A',
      topCohort: 'N/A',
    };
  }
};

// Alerts / Red Flags system
// Accepts optional activityOverview to avoid duplicate queries
export const getAlerts = async (activityOverview?: Awaited<ReturnType<typeof getUserActivityOverview>>) => {
  try {
    const alerts: Array<{ type: 'warning' | 'critical'; message: string; id: string }> = [];
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const yesterdayEnd = new Date(todayStart);
    
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Get activity overview if not provided
    let activity;
    try {
      activity = activityOverview ?? await getUserActivityOverview();
    } catch (error: any) {
      console.error('Error getting activity overview for alerts:', error);
      // Return empty alerts if we can't get activity data
      return [];
    }

  // 1. DAU Drop: DAU today ≥30% lower than yesterday
  // Fetch yesterday data sequentially to avoid connection pool exhaustion
  const yesterdayDiscountUses = await prisma.discountUse.findMany({
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    select: { user_id: true, status: true, confirmedAt: true },
  });
  
  const viewsYesterday = await prisma.venueView.findMany({
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    select: { user_id: true },
  });
  
  const qrYesterday = yesterdayDiscountUses;
  const confirmedYesterday = yesterdayDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt && c.confirmedAt >= yesterdayStart && c.confirmedAt < yesterdayEnd);

  const activeUsersYesterday = new Set<string>();
  viewsYesterday.forEach(v => v.user_id && activeUsersYesterday.add(v.user_id));
  qrYesterday.forEach(q => q.user_id && activeUsersYesterday.add(q.user_id));
  confirmedYesterday.forEach(c => c.user_id && activeUsersYesterday.add(c.user_id));

  const dauYesterday = activeUsersYesterday.size;
  if (dauYesterday > 0 && activity.dau < dauYesterday * 0.7) {
    const dropPercent = Number(((1 - activity.dau / dauYesterday) * 100).toFixed(1));
    alerts.push({
      type: 'critical',
      message: `DAU dropped ${dropPercent}% (${activity.dau} vs ${dauYesterday} yesterday)`,
      id: 'dau-drop',
    });
  }

  // 2. Low Retention: Returning users % < 25%
  if (activity.returningPercentage < 25) {
    alerts.push({
      type: 'critical',
      message: `Low retention: ${activity.returningPercentage}% returning users (< 25%)`,
      id: 'low-retention',
    });
  }

  // 3. Low Engagement: Avg discounts per user < 1.2 (7-day window)
  if (activity.avgDiscountsPerUser < 1.2) {
    alerts.push({
      type: 'warning',
      message: `Low engagement: ${activity.avgDiscountsPerUser} avg discounts/user (< 1.2)`,
      id: 'low-engagement',
    });
  }

  // 4. Fake Growth: MAU (30d) increases while DAU (7d avg) stays flat or decreases
  // Compare current MAU with previous month's MAU, and check if 7d avg DAU is flat/decreasing
  const previousMonthStart = new Date(monthStart);
  previousMonthStart.setDate(previousMonthStart.getDate() - 30);
  const previousMonthEnd = monthStart;

  // Get previous month's MAU (30-60 days ago) - sequential queries
  const prevMonthDiscountUses = await prisma.discountUse.findMany({
    where: { createdAt: { gte: previousMonthStart, lt: previousMonthEnd } },
    select: { user_id: true, status: true, confirmedAt: true },
  });
  
  const prevMonthViews = await prisma.venueView.findMany({
    where: { createdAt: { gte: previousMonthStart, lt: previousMonthEnd } },
    select: { user_id: true },
  });
  
  const prevMonthQr = prevMonthDiscountUses;
  const prevMonthConfirmed = prevMonthDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt && c.confirmedAt >= previousMonthStart && c.confirmedAt < previousMonthEnd);

  const prevMonthActiveUsers = new Set<string>();
  prevMonthViews.forEach(v => v.user_id && prevMonthActiveUsers.add(v.user_id));
  prevMonthQr.forEach(q => q.user_id && prevMonthActiveUsers.add(q.user_id));
  prevMonthConfirmed.forEach(c => c.user_id && prevMonthActiveUsers.add(c.user_id));

  const prevMonthMAU = prevMonthActiveUsers.size;

  // Get 7d avg DAU from previous week (to compare with current WAU)
  const weekAgoStart = new Date(weekStart);
  weekAgoStart.setDate(weekAgoStart.getDate() - 7);
  
  // Sequential queries to avoid connection pool exhaustion
  const weekAgoDiscountUses = await prisma.discountUse.findMany({
    where: { createdAt: { gte: weekAgoStart, lt: weekStart } },
    select: { user_id: true, status: true, confirmedAt: true },
  });
  
  const views7dAgo = await prisma.venueView.findMany({
    where: { createdAt: { gte: weekAgoStart, lt: weekStart } },
    select: { user_id: true },
  });
  
  const qr7dAgo = weekAgoDiscountUses;
  const confirmed7dAgo = weekAgoDiscountUses.filter(c => c.status === 'confirmed' && c.confirmedAt && c.confirmedAt >= weekAgoStart && c.confirmedAt < weekStart);

  const activeUsers7dAgo = new Set<string>();
  views7dAgo.forEach(v => v.user_id && activeUsers7dAgo.add(v.user_id));
  qr7dAgo.forEach(q => q.user_id && activeUsers7dAgo.add(q.user_id));
  confirmed7dAgo.forEach(c => c.user_id && activeUsers7dAgo.add(c.user_id));

  const prevWeekWAU = activeUsers7dAgo.size;
  const currentWAU = activity.wau;
  
  // Fake Growth: MAU increased but 7d avg DAU (WAU) is flat or decreasing
  const mauIncreased = activity.mau > prevMonthMAU * 1.1; // 10% increase threshold
  const dauFlatOrDecreasing = currentWAU <= prevWeekWAU * 1.05; // Within 5% = flat, less = decreasing
  
  if (mauIncreased && dauFlatOrDecreasing && prevMonthMAU > 0) {
    alerts.push({
      type: 'warning',
      message: `Fake growth detected: MAU increased to ${activity.mau} (from ${prevMonthMAU}) but 7d active users flat/decreasing (${currentWAU} vs ${prevWeekWAU})`,
      id: 'fake-growth',
    });
  }

    return alerts;
  } catch (error: any) {
    console.error('Error in getAlerts:', error);
    // Return empty alerts instead of throwing to prevent dashboard crash
    return [];
  }
};
