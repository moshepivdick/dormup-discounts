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
  const allViews = await prisma.venueView.findMany({
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

  // Deduplicate by dedupe_key to handle any legacy duplicates
  const viewsMap = new Map<string, typeof allViews[0]>();
  for (const view of allViews) {
    const existing = viewsMap.get(view.dedupe_key);
    if (!existing || new Date(view.createdAt) > new Date(existing.createdAt)) {
      viewsMap.set(view.dedupe_key, view);
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
        venueName: view.venue.name,
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
  // Since we now have a unique constraint on dedupe_key, duplicates should be prevented at DB level
  // However, we still deduplicate here to handle any legacy duplicates that might exist
  const allViews = await prisma.venueView.findMany({
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

  // Deduplicate by dedupe_key, keeping the most recent view for each unique key
  // This handles any legacy duplicates that might exist before the unique constraint was added
  const viewsMap = new Map<string, typeof allViews[0]>();
  for (const view of allViews) {
    const existing = viewsMap.get(view.dedupe_key);
    if (!existing || new Date(view.createdAt) > new Date(existing.createdAt)) {
      viewsMap.set(view.dedupe_key, view);
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

