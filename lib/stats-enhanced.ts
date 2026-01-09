import { prisma } from '@/lib/prisma';

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
    const views = await prisma.venueView.findMany({
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    allViews = views as ViewWithProfile[];
  } catch (error: any) {
    // If Prisma query fails, log error and return empty array
    // This is safer than using raw SQL with string interpolation
    console.error('Error fetching views:', error?.code, error?.message?.substring(0, 100));
    allViews = [];
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
  const discountUses = await prisma.discountUse.findMany({
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
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate metrics
  const pageViews = views.length;
  const uniqueStudents = new Set(views.map((v) => v.user_id).filter(Boolean)).size;
  const discountsRedeemed = discountUses.filter((d) => d.status === 'confirmed').length;
  
  // Verified student visits: count of confirmed discounts by verified students
  const verifiedStudentVisits = discountUses.filter(
    (d) => d.status === 'confirmed' && d.profiles?.verified_student === true
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
    }, {}),
    allDiscountUses: discountUses,
  };
};
