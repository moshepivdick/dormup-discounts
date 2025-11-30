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

