import { prisma } from '@/lib/prisma';

// Timezone: Europe/Rome
const TIMEZONE = 'Europe/Rome';

/**
 * Get the start and end dates for a month in Europe/Rome timezone
 */
export function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
  // Create date in UTC first, then convert to Europe/Rome
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  
  // Adjust for Europe/Rome timezone (UTC+1 or UTC+2 depending on DST)
  // For simplicity, we'll use UTC dates and let PostgreSQL handle timezone conversion
  // PostgreSQL will store dates in the database timezone
  return { start, end };
}

/**
 * Parse month string "YYYY-MM" to year and month
 */
export function parseMonth(monthStr: string): { year: number; month: number } {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month format: ${monthStr}. Expected YYYY-MM`);
  }
  return { year, month };
}

/**
 * Compute daily metrics for a specific partner/venue and date
 */
export async function computeDailyMetrics(
  venueId: number,
  date: Date
): Promise<{
  page_views: number;
  qr_generated: number;
  qr_redeemed: number;
  unique_users: number;
  conversion_rate: number;
  repeat_users: number;
}> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Get partner for this venue
  const partner = await prisma.partner.findUnique({
    where: { venueId },
    select: { id: true },
  });

  // Count page views (VenueView)
  const pageViews = await prisma.venueView.count({
    where: {
      venueId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  // Count QR codes generated (DiscountUse created in this period)
  const qrGenerated = await prisma.discountUse.count({
    where: {
      venueId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  // Count QR codes redeemed (status = 'confirmed' and confirmedAt in period)
  const qrRedeemed = await prisma.discountUse.count({
    where: {
      venueId,
      status: 'confirmed',
      confirmedAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  // Count unique users (from both views and discount uses)
  const uniqueUserIds = new Set<string>();
  
  const views = await prisma.venueView.findMany({
    where: {
      venueId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    select: { user_id: true },
  });
  views.forEach((v) => {
    if (v.user_id) uniqueUserIds.add(v.user_id);
  });

  const discountUses = await prisma.discountUse.findMany({
    where: {
      venueId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    select: { user_id: true },
  });
  discountUses.forEach((d) => {
    if (d.user_id) uniqueUserIds.add(d.user_id);
  });

  const uniqueUsers = uniqueUserIds.size;

  // Conversion rate: qr_redeemed / qr_generated (if qr_generated > 0)
  const conversionRate = qrGenerated > 0 ? (qrRedeemed / qrGenerated) * 100 : 0;

  // Repeat users: users who have confirmed discounts >= 2 in this day
  const userConfirmedCounts = await prisma.discountUse.groupBy({
    by: ['user_id'],
    where: {
      venueId,
      status: 'confirmed',
      confirmedAt: {
        gte: dayStart,
        lte: dayEnd,
      },
      user_id: { not: null },
    },
    _count: {
      id: true,
    },
  });
  const repeatUsers = userConfirmedCounts.filter((u) => (u._count.id || 0) >= 2).length;

  return {
    page_views: pageViews,
    qr_generated: qrGenerated,
    qr_redeemed: qrRedeemed,
    unique_users: uniqueUsers,
    conversion_rate: Number(conversionRate.toFixed(2)),
    repeat_users: repeatUsers,
  };
}

/**
 * Compute monthly metrics for a specific partner/venue
 */
export async function computeMonthlyPartnerMetrics(
  venueId: number,
  monthStr: string
): Promise<{
  page_views: number;
  qr_generated: number;
  qr_redeemed: number;
  unique_users: number;
  conversion_rate: number;
  repeat_users: number;
}> {
  const { year, month } = parseMonth(monthStr);
  const { start, end } = getMonthBounds(year, month);

  // Get partner for this venue
  const partner = await prisma.partner.findUnique({
    where: { venueId },
    select: { id: true },
  });

  // Count page views
  const pageViews = await prisma.venueView.count({
    where: {
      venueId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Count QR codes generated
  const qrGenerated = await prisma.discountUse.count({
    where: {
      venueId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Count QR codes redeemed
  const qrRedeemed = await prisma.discountUse.count({
    where: {
      venueId,
      status: 'confirmed',
      confirmedAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Count unique users
  const uniqueUserIds = new Set<string>();
  
  const views = await prisma.venueView.findMany({
    where: {
      venueId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: { user_id: true },
  });
  views.forEach((v) => {
    if (v.user_id) uniqueUserIds.add(v.user_id);
  });

  const discountUses = await prisma.discountUse.findMany({
    where: {
      venueId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: { user_id: true },
  });
  discountUses.forEach((d) => {
    if (d.user_id) uniqueUserIds.add(d.user_id);
  });

  const uniqueUsers = uniqueUserIds.size;

  // Conversion rate
  const conversionRate = qrGenerated > 0 ? (qrRedeemed / qrGenerated) * 100 : 0;

  // Repeat users: users with >= 2 confirmed discounts in the month
  const userConfirmedCounts = await prisma.discountUse.groupBy({
    by: ['user_id'],
    where: {
      venueId,
      status: 'confirmed',
      confirmedAt: {
        gte: start,
        lte: end,
      },
      user_id: { not: null },
    },
    _count: {
      id: true,
    },
  });
  const repeatUsers = userConfirmedCounts.filter((u) => (u._count.id || 0) >= 2).length;

  return {
    page_views: pageViews,
    qr_generated: qrGenerated,
    qr_redeemed: qrRedeemed,
    unique_users: uniqueUsers,
    conversion_rate: Number(conversionRate.toFixed(2)),
    repeat_users: repeatUsers,
  };
}

/**
 * Compute monthly global metrics (all partners combined)
 */
export async function computeMonthlyGlobalMetrics(monthStr: string): Promise<{
  total_partners: number;
  page_views: number;
  qr_generated: number;
  qr_redeemed: number;
  unique_users: number;
  conversion_rate: number;
}> {
  const { year, month } = parseMonth(monthStr);
  const { start, end } = getMonthBounds(year, month);

  // Count active partners (venues with partner)
  const totalPartners = await prisma.partner.count({
    where: {
      isActive: true,
      venue: {
        isActive: true,
      },
    },
  });

  // Count page views (all venues)
  const pageViews = await prisma.venueView.count({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Count QR codes generated
  const qrGenerated = await prisma.discountUse.count({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Count QR codes redeemed
  const qrRedeemed = await prisma.discountUse.count({
    where: {
      status: 'confirmed',
      confirmedAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Count unique users (across all venues)
  const uniqueUserIds = new Set<string>();
  
  const views = await prisma.venueView.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: { user_id: true },
  });
  views.forEach((v) => {
    if (v.user_id) uniqueUserIds.add(v.user_id);
  });

  const discountUses = await prisma.discountUse.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: { user_id: true },
  });
  discountUses.forEach((d) => {
    if (d.user_id) uniqueUserIds.add(d.user_id);
  });

  const uniqueUsers = uniqueUserIds.size;

  // Conversion rate
  const conversionRate = qrGenerated > 0 ? (qrRedeemed / qrGenerated) * 100 : 0;

  return {
    total_partners: totalPartners,
    page_views: pageViews,
    qr_generated: qrGenerated,
    qr_redeemed: qrRedeemed,
    unique_users: uniqueUsers,
    conversion_rate: Number(conversionRate.toFixed(2)),
  };
}

/**
 * Upsert monthly partner metrics (compute and store)
 */
export async function upsertMonthlyPartnerMetrics(
  venueId: number,
  monthStr: string
): Promise<void> {
  const { year, month } = parseMonth(monthStr);
  const { start, end } = getMonthBounds(year, month);

  const partner = await prisma.partner.findUnique({
    where: { venueId },
    select: { id: true },
  });

  const metrics = await computeMonthlyPartnerMetrics(venueId, monthStr);

  // Use findFirst + create/update since Prisma generates constraint names
  const existing = await prisma.monthlyPartnerMetrics.findFirst({
    where: {
      venue_id: venueId,
      period_start: start,
    },
  });

  if (existing) {
    await prisma.monthlyPartnerMetrics.update({
      where: { id: existing.id },
      data: {
        page_views: metrics.page_views,
        qr_generated: metrics.qr_generated,
        qr_redeemed: metrics.qr_redeemed,
        unique_users: metrics.unique_users,
        conversion_rate: metrics.conversion_rate,
        repeat_users: metrics.repeat_users,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.monthlyPartnerMetrics.create({
      data: {
        partner_id: partner?.id || null,
        venue_id: venueId,
        period_start: start,
        period_end: end,
        page_views: metrics.page_views,
        qr_generated: metrics.qr_generated,
        qr_redeemed: metrics.qr_redeemed,
        unique_users: metrics.unique_users,
        conversion_rate: metrics.conversion_rate,
        repeat_users: metrics.repeat_users,
      },
    });
  }
}

/**
 * Upsert monthly global metrics
 */
export async function upsertMonthlyGlobalMetrics(monthStr: string): Promise<void> {
  const { year, month } = parseMonth(monthStr);
  const { start, end } = getMonthBounds(year, month);

  const metrics = await computeMonthlyGlobalMetrics(monthStr);

  const existingGlobal = await prisma.monthlyGlobalMetrics.findUnique({
    where: { period_start: start },
  });

  if (existingGlobal) {
    await prisma.monthlyGlobalMetrics.update({
      where: { id: existingGlobal.id },
      data: {
        total_partners: metrics.total_partners,
        page_views: metrics.page_views,
        qr_generated: metrics.qr_generated,
        qr_redeemed: metrics.qr_redeemed,
        unique_users: metrics.unique_users,
        conversion_rate: metrics.conversion_rate,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.monthlyGlobalMetrics.create({
      data: {
        period_start: start,
        period_end: end,
        total_partners: metrics.total_partners,
        page_views: metrics.page_views,
        qr_generated: metrics.qr_generated,
        qr_redeemed: metrics.qr_redeemed,
        unique_users: metrics.unique_users,
        conversion_rate: metrics.conversion_rate,
      },
    });
  }
}

/**
 * Backfill monthly metrics for the last N months
 */
export async function backfillMonthlyMetrics(months: number = 3): Promise<void> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  for (let i = 0; i < months; i++) {
    let year = currentYear;
    let month = currentMonth - i;
    
    while (month <= 0) {
      month += 12;
      year -= 1;
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    console.log(`Backfilling ${monthStr}...`);

    // Compute global metrics
    await upsertMonthlyGlobalMetrics(monthStr);

    // Compute metrics for each venue with a partner
    const venues = await prisma.venue.findMany({
      where: {
        partner: { isNot: null },
        isActive: true,
      },
      select: { id: true },
    });

    for (const venue of venues) {
      await upsertMonthlyPartnerMetrics(venue.id, monthStr);
    }
  }

  console.log(`Backfill complete for last ${months} months`);
}

/**
 * Get monthly admin report (global + per-partner)
 */
export async function getMonthlyAdminReport(monthStr: string) {
  const { year, month } = parseMonth(monthStr);
  const { start, end } = getMonthBounds(year, month);

  // Ensure metrics are computed
  await upsertMonthlyGlobalMetrics(monthStr);

  // Get global metrics
  const globalMetrics = await prisma.monthlyGlobalMetrics.findUnique({
    where: { period_start: start },
  });

  if (!globalMetrics) {
    throw new Error(`No global metrics found for ${monthStr}`);
  }

  // Get per-partner metrics
  const partnerMetrics = await prisma.monthlyPartnerMetrics.findMany({
    where: {
      period_start: start,
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
        },
      },
      partner: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      qr_redeemed: 'desc',
    },
  });

  // Detect anomalies
  const anomalies: Array<{ type: string; venue: string; message: string }> = [];

  for (const pm of partnerMetrics) {
    // High QR generated but low redeemed
    if (pm.qr_generated > 10 && pm.qr_redeemed < pm.qr_generated * 0.3) {
      anomalies.push({
        type: 'low_conversion',
        venue: pm.venue.name,
        message: `Low conversion rate: ${pm.qr_generated} generated but only ${pm.qr_redeemed} redeemed (${pm.conversion_rate.toFixed(1)}%)`,
      });
    }

    // Check for single user generating too many codes (if we had user-level data)
    // This would require additional query, so we'll skip for now
  }

  // Compare with previous month for spikes
  const prevMonth = new Date(start);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevGlobal = await prisma.monthlyGlobalMetrics.findUnique({
    where: { period_start: prevMonth },
  });

  if (prevGlobal) {
    const pageViewsChange = ((globalMetrics.page_views - prevGlobal.page_views) / prevGlobal.page_views) * 100;
    if (Math.abs(pageViewsChange) > 50) {
      anomalies.push({
        type: 'spike',
        venue: 'Global',
        message: `Page views ${pageViewsChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(pageViewsChange).toFixed(1)}% compared to previous month`,
      });
    }
  }

  return {
    global: globalMetrics,
    partners: partnerMetrics,
    anomalies,
  };
}

/**
 * Get monthly partner report
 */
export async function getMonthlyPartnerReport(venueId: number, monthStr: string) {
  // Ensure metrics are computed
  await upsertMonthlyPartnerMetrics(venueId, monthStr);

  const { year, month } = parseMonth(monthStr);
  const { start } = getMonthBounds(year, month);

  const { end } = getMonthBounds(year, month);

  const metrics = await prisma.monthlyPartnerMetrics.findFirst({
    where: {
      venue_id: venueId,
      period_start: start,
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
          avgStudentBill: true,
        },
      },
    },
  });

  if (!metrics) {
    throw new Error(`No metrics found for venue ${venueId} in ${monthStr}`);
  }

  // Calculate impact summary data
  // 1. Unique users who redeemed (distinct users with confirmed discounts)
  const uniqueUsersRedeemed = await prisma.discountUse.findMany({
    where: {
      venueId,
      status: 'confirmed',
      confirmedAt: {
        gte: start,
        lte: end,
      },
      user_id: { not: null },
    },
    select: { user_id: true },
    distinct: ['user_id'],
  });
  const uniqueCustomersCount = uniqueUsersRedeemed.length;

  // 2. Total redemptions (already in metrics.qr_redeemed)
  const totalRedemptions = metrics.qr_redeemed;

  // 3. Estimated impact (redemptions * avgStudentBill if available)
  const avgTicket = metrics.venue.avgStudentBill;
  const estimatedImpact = avgTicket && avgTicket > 0 
    ? totalRedemptions * avgTicket 
    : null;

  // 4. Best time: weekday + hour range with highest redemptions
  const redemptions = await prisma.discountUse.findMany({
    where: {
      venueId,
      status: 'confirmed',
      confirmedAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      confirmedAt: true,
    },
  });

  // Group by weekday and hour (for finding peak hours)
  const hourCountsByWeekday: Record<string, Record<number, number>> = {};
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  redemptions.forEach((r) => {
    if (!r.confirmedAt) return;
    const date = new Date(r.confirmedAt);
    const weekday = weekdayNames[date.getDay()];
    const hour = date.getHours();
    
    if (!hourCountsByWeekday[weekday]) {
      hourCountsByWeekday[weekday] = {};
    }
    hourCountsByWeekday[weekday][hour] = (hourCountsByWeekday[weekday][hour] || 0) + 1;
  });

  // Find best time: weekday with most redemptions, then find peak hour range
  let bestTime: string | null = null;
  if (Object.keys(hourCountsByWeekday).length > 0) {
    // Find weekday with most total redemptions
    const weekdayTotals = Object.entries(hourCountsByWeekday).map(([day, hours]) => ({
      day,
      total: Object.values(hours).reduce((sum, count) => sum + count, 0),
      hours,
    }));
    weekdayTotals.sort((a, b) => b.total - a.total);
    
    const bestWeekday = weekdayTotals[0];
    
    // Find peak hour range (4-hour window) for that weekday
    const hours = bestWeekday.hours;
    let maxCount = 0;
    let bestStartHour = 0;
    
    // Check 4-hour windows (0-3, 1-4, 2-5, ..., 20-23)
    for (let startHour = 0; startHour <= 20; startHour++) {
      let windowCount = 0;
      for (let h = startHour; h < startHour + 4 && h <= 23; h++) {
        windowCount += hours[h] || 0;
      }
      if (windowCount > maxCount) {
        maxCount = windowCount;
        bestStartHour = startHour;
      }
    }
    
    if (maxCount > 0) {
      const endHour = Math.min(bestStartHour + 3, 23);
      bestTime = `${bestWeekday.day} ${bestStartHour}–${endHour}`;
    }
  }

  // Generate insights
  const insights: string[] = [];

  if (metrics.conversion_rate > 50) {
    insights.push(`Excellent conversion rate of ${metrics.conversion_rate.toFixed(1)}% - students are actively using your discounts!`);
  } else if (metrics.conversion_rate < 20) {
    insights.push(`Conversion rate is ${metrics.conversion_rate.toFixed(1)}% - consider promoting your discounts more actively.`);
  }

  if (metrics.repeat_users > 0) {
    insights.push(`${metrics.repeat_users} returning customers this month - great customer retention!`);
  }

  if (metrics.unique_users > 0) {
    const avgPerUser = (metrics.qr_redeemed / metrics.unique_users).toFixed(1);
    insights.push(`Average of ${avgPerUser} redemptions per unique student.`);
  }

  if (insights.length === 0) {
    insights.push('Keep promoting your discounts to increase engagement!');
  }

  return {
    metrics,
    insights,
    impactSummary: {
      uniqueCustomers: uniqueCustomersCount,
      totalRedemptions,
      estimatedImpact,
      avgTicket,
      bestTime,
    },
  };
}
