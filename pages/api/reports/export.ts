import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { parseMonth, getMonthBounds } from '@/lib/reports';
import { assertTier } from '@/lib/subscription';
import { SubscriptionTier } from '@prisma/client';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin or partner
  const admin = await auth.getAdminFromRequest(req);
  const partner = await auth.getPartnerFromRequest(req);

  if (!admin && !partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  // Get parameters
  const type = (req.query.type as string) || 'csv';
  const scope = (req.query.scope as string) || (admin ? 'admin' : 'partner');
  const month = req.query.month as string;
  const partnerIdParam = req.query.partnerId as string;

  if (!['csv', 'json'].includes(type)) {
    return apiResponse.error(res, 400, 'Invalid type. Must be "csv" or "json"');
  }

  if (!['admin', 'partner'].includes(scope)) {
    return apiResponse.error(res, 400, 'Invalid scope. Must be "admin" or "partner"');
  }

  // Determine venue/partner filter
  let venueId: number | undefined;
  if (scope === 'partner') {
    if (admin && partnerIdParam) {
      // Admin requesting specific partner
      const requestedPartner = await prisma.partner.findUnique({
        where: { id: partnerIdParam },
        select: { venueId: true },
      });
      if (!requestedPartner) {
        return apiResponse.error(res, 404, 'Partner not found');
      }
      venueId = requestedPartner.venueId;
    } else if (partner) {
      // Partner requesting their own
      venueId = partner.venueId;
      const allowed = assertTier(partner.venue?.subscriptionTier, SubscriptionTier.MAX, res);
      if (!allowed) {
        return;
      }
    } else {
      return apiResponse.error(res, 400, 'partnerId required for partner scope');
    }
  }

  // Get month (default to current month)
  let monthStr = month;
  if (!monthStr) {
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;
    monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  }

  // Validate month
  let start: Date, end: Date;
  try {
    const { year, month: monthNum } = parseMonth(monthStr);
    const bounds = getMonthBounds(year, monthNum);
    start = bounds.start;
    end = bounds.end;
  } catch (error: any) {
    return apiResponse.error(res, 400, error.message || 'Invalid month format');
  }

  try {
    // Fetch raw events
    const views = await prisma.venueView.findMany({
      where: {
        ...(venueId ? { venueId } : {}),
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        profiles: {
          select: {
            id: true,
            email: true,
            first_name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent memory issues
    });

    const discountUses = await prisma.discountUse.findMany({
      where: {
        ...(venueId ? { venueId } : {}),
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        profiles: {
          select: {
            id: true,
            email: true,
            first_name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    // Format data
    const events = [
      ...views.map((v) => ({
        event_type: 'PAGE_VIEW',
        timestamp: v.createdAt.toISOString(),
        venue_id: v.venueId,
        venue_name: v.venue?.name || 'Unknown',
        user_id: v.user_id || null,
        user_email: v.profiles?.email || null,
        metadata: {
          city: v.city,
          user_agent: v.userAgent || null,
        },
      })),
      ...discountUses.map((d) => ({
        event_type: d.status === 'confirmed' ? 'QR_REDEEMED' : 'QR_GENERATED',
        timestamp: (d.confirmedAt || d.createdAt).toISOString(),
        venue_id: d.venueId,
        venue_name: d.venue?.name || 'Unknown',
        user_id: d.user_id || null,
        user_email: d.profiles?.email || null,
        metadata: {
          code: d.generatedCode,
          status: d.status,
          qr_slug: d.qrSlug || null,
        },
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Export as CSV or JSON
    if (type === 'csv') {
      if (events.length === 0) {
        return apiResponse.error(res, 404, 'No data found for the specified period');
      }

      // CSV header
      const headers = [
        'event_type',
        'timestamp',
        'venue_id',
        'venue_name',
        'user_id',
        'user_email',
        'metadata',
      ];

      // CSV rows
      const rows = events.map((e) => [
        e.event_type,
        e.timestamp,
        String(e.venue_id),
        e.venue_name,
        e.user_id || '',
        e.user_email || '',
        JSON.stringify(e.metadata),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${monthStr}-${scope}.csv"`);
      return res.status(200).send(csv);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${monthStr}-${scope}.json"`);
      return apiResponse.success(res, {
        month: monthStr,
        scope,
        venue_id: venueId || null,
        total_events: events.length,
        events,
      });
    }
  } catch (error: any) {
    console.error('Error exporting report:', error);
    return apiResponse.error(res, 500, 'Failed to export report', error);
  }
});
