import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import * as crypto from 'crypto';
import { stringify } from 'csv-stringify';
import ExcelJS from 'exceljs';

const MAX_DATE_RANGE_DAYS = parseInt(process.env.MAX_EXPORT_DATE_RANGE_DAYS || '31', 10);
const XLSX_MAX_ROWS = parseInt(process.env.XLSX_MAX_ROWS || '10000', 10);
const CSV_LARGE_EXPORT_THRESHOLD = parseInt(process.env.CSV_LARGE_EXPORT_THRESHOLD || '50000', 10);

type EventType = 'PAGE_VIEW' | 'QR_GENERATED' | 'QR_REDEEMED';

interface EventRow {
  event_id: string;
  event_type: EventType;
  created_at_utc: string;
  created_at_local: string;
  partner_id: string | null;
  partner_name: string | null;
  user_id_hash: string | null;
  discount_id: number | null;
  metadata_json: string;
  source: string | null;
}

/**
 * Hash user_id for privacy (consistent hash)
 */
function hashUserId(userId: string | null): string | null {
  if (!userId) return null;
  // Use SHA256 for consistent hashing
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
}

/**
 * Convert UTC date to Europe/Rome timezone
 */
function toEuropeRome(utcDate: Date): string {
  // Europe/Rome is UTC+1 (CET) or UTC+2 (CEST)
  // For simplicity, we'll use toLocaleString with timezone
  return utcDate.toLocaleString('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
}

/**
 * Query events from VenueView and DiscountUse
 */
async function queryEvents(params: {
  from: Date;
  to: Date;
  partnerId?: string;
  eventTypes?: EventType[];
}): Promise<EventRow[]> {
  const { from, to, partnerId, eventTypes } = params;
  const events: EventRow[] = [];

  // Build venue filter
  let venueId: number | undefined;
  if (partnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { venueId: true },
    });
    if (!partner) {
      throw new Error('Partner not found');
    }
    venueId = partner.venueId;
  }

  // Query VenueView events (PAGE_VIEW)
  if (!eventTypes || eventTypes.includes('PAGE_VIEW')) {
    const where: any = {
      createdAt: {
        gte: from,
        lte: to,
      },
    };
    if (venueId) {
      where.venueId = venueId;
    }

    const views = await prisma.venueView.findMany({
      where,
      include: {
        venue: {
          include: {
            partner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const view of views) {
      events.push({
        event_id: `view_${view.id}`,
        event_type: 'PAGE_VIEW',
        created_at_utc: view.createdAt.toISOString(),
        created_at_local: toEuropeRome(view.createdAt),
        partner_id: view.venue.partner?.id || null,
        partner_name: view.venue.partner?.email || null,
        user_id_hash: hashUserId(view.user_id),
        discount_id: null,
        metadata_json: JSON.stringify({
          venue_id: view.venueId,
          venue_name: view.venue.name,
          city: view.city,
          user_agent: view.userAgent || null,
        }),
        source: 'venue_view',
      });
    }
  }

  // Query DiscountUse events (QR_GENERATED, QR_REDEEMED)
  if (!eventTypes || eventTypes.includes('QR_GENERATED') || eventTypes.includes('QR_REDEEMED')) {
    const where: any = {
      createdAt: {
        gte: from,
        lte: to,
      },
    };
    if (venueId) {
      where.venueId = venueId;
    }

    const discountUses = await prisma.discountUse.findMany({
      where,
      include: {
        venue: {
          include: {
            partner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const discount of discountUses) {
      // QR_GENERATED event
      if (!eventTypes || eventTypes.includes('QR_GENERATED')) {
        events.push({
          event_id: `qr_gen_${discount.id}`,
          event_type: 'QR_GENERATED',
          created_at_utc: discount.createdAt.toISOString(),
          created_at_local: toEuropeRome(discount.createdAt),
          partner_id: discount.venue.partner?.id || null,
          partner_name: discount.venue.partner?.email || null,
          user_id_hash: hashUserId(discount.user_id),
          discount_id: discount.id,
          metadata_json: JSON.stringify({
            venue_id: discount.venueId,
            venue_name: discount.venue.name,
            generated_code: discount.generatedCode,
            qr_slug: discount.qrSlug || null,
            status: discount.status,
            expires_at: discount.expiresAt.toISOString(),
          }),
          source: 'discount_use',
        });
      }

      // QR_REDEEMED event (if confirmed)
      if (discount.status === 'confirmed' && discount.confirmedAt) {
        if (!eventTypes || eventTypes.includes('QR_REDEEMED')) {
          events.push({
            event_id: `qr_redeemed_${discount.id}`,
            event_type: 'QR_REDEEMED',
            created_at_utc: discount.confirmedAt.toISOString(),
            created_at_local: toEuropeRome(discount.confirmedAt),
            partner_id: discount.venue.partner?.id || null,
            partner_name: discount.venue.partner?.email || null,
            user_id_hash: hashUserId(discount.user_id),
            discount_id: discount.id,
            metadata_json: JSON.stringify({
              venue_id: discount.venueId,
              venue_name: discount.venue.name,
              generated_code: discount.generatedCode,
              qr_slug: discount.qrSlug || null,
            }),
            source: 'discount_use',
          });
        }
      }
    }
  }

  // Sort all events by created_at_utc
  events.sort((a, b) => a.created_at_utc.localeCompare(b.created_at_utc));

  return events;
}

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin authentication
  let admin = await auth.getAdminFromRequest(req);
  let isSupabaseAdmin = false;

  // Try Supabase auth if cookie auth fails
  if (!admin) {
    try {
      const supabase = createClientFromRequest(req);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (profile?.is_admin) {
          isSupabaseAdmin = true;
        }
      }
    } catch (error) {
      console.error('Error checking Supabase auth:', error);
    }
  }

  if (!admin && !isSupabaseAdmin) {
    return apiResponse.error(res, 403, 'Forbidden: Admin access required');
  }

  // Parse query parameters
  const format = (req.query.format as string) || 'csv';
  const fromStr = req.query.from as string;
  const toStr = req.query.to as string;
  const partnerId = req.query.partnerId as string | undefined;
  const typesStr = req.query.types as string | undefined;
  const tz = (req.query.tz as string) || 'Europe/Rome';

  // Validate format
  if (format !== 'csv' && format !== 'xlsx') {
    return apiResponse.error(res, 400, 'Invalid format. Must be "csv" or "xlsx"');
  }

  // Validate date range
  if (!fromStr || !toStr) {
    return apiResponse.error(res, 400, 'Missing required parameters: "from" and "to" (YYYY-MM-DD)');
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);
  to.setHours(23, 59, 59, 999); // Include the entire end date

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return apiResponse.error(res, 400, 'Invalid date format. Use YYYY-MM-DD');
  }

  if (from > to) {
    return apiResponse.error(res, 400, '"from" date must be before or equal to "to" date');
  }

  // Validate date range length
  const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > MAX_DATE_RANGE_DAYS) {
    return apiResponse.error(res, 400, `Date range exceeds maximum of ${MAX_DATE_RANGE_DAYS} days. Use CSV format or narrow the range.`);
  }

  // Parse event types
  let eventTypes: EventType[] | undefined;
  if (typesStr) {
    const types = typesStr.split(',').map(t => t.trim().toUpperCase() as EventType);
    const validTypes: EventType[] = ['PAGE_VIEW', 'QR_GENERATED', 'QR_REDEEMED'];
    const invalidTypes = types.filter(t => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      return apiResponse.error(res, 400, `Invalid event types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`);
    }
    eventTypes = types;
  }

  try {
    // Query events
    const events = await queryEvents({
      from,
      to,
      partnerId,
      eventTypes,
    });

    // Generate filename
    const fromDateStr = from.toISOString().split('T')[0].replace(/-/g, '');
    const toDateStr = to.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `dormup-events-${fromDateStr}-${toDateStr}.${format}`;

    // Handle CSV format
    if (format === 'csv') {
      // Stream CSV response
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // CSV headers
      const headers = [
        'event_id',
        'event_type',
        'created_at_utc',
        'created_at_local',
        'partner_id',
        'partner_name',
        'user_id_hash',
        'discount_id',
        'metadata_json',
        'source',
      ];

      // Create CSV stringifier
      const stringifier = stringify({
        header: true,
        columns: headers,
      });

      // Pipe to response
      stringifier.pipe(res);

      // Write events
      for (const event of events) {
        stringifier.write([
          event.event_id,
          event.event_type,
          event.created_at_utc,
          event.created_at_local,
          event.partner_id || '',
          event.partner_name || '',
          event.user_id_hash || '',
          event.discount_id || '',
          event.metadata_json,
          event.source || '',
        ]);
      }

      stringifier.end();

      // Handle stream completion
      return new Promise<void>((resolve, reject) => {
        stringifier.on('error', (err) => {
          if (!res.headersSent) {
            res.status(500).json({ error: 'CSV generation failed' });
          }
          reject(err);
        });
        res.on('finish', resolve);
        res.on('error', reject);
        
        // Ensure response ends when stringifier ends
        stringifier.on('end', () => {
          if (!res.writableEnded) {
            res.end();
          }
        });
      });
    }

    // Handle XLSX format
    if (format === 'xlsx') {
      // Check row limit
      if (events.length > XLSX_MAX_ROWS) {
        return apiResponse.error(res, 413, `XLSX export too large (${events.length} rows). Maximum is ${XLSX_MAX_ROWS} rows. Use CSV format or narrow the date range.`);
      }

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Events');

      // Add headers
      worksheet.columns = [
        { header: 'event_id', key: 'event_id', width: 20 },
        { header: 'event_type', key: 'event_type', width: 15 },
        { header: 'created_at_utc', key: 'created_at_utc', width: 25 },
        { header: 'created_at_local', key: 'created_at_local', width: 25 },
        { header: 'partner_id', key: 'partner_id', width: 40 },
        { header: 'partner_name', key: 'partner_name', width: 30 },
        { header: 'user_id_hash', key: 'user_id_hash', width: 20 },
        { header: 'discount_id', key: 'discount_id', width: 15 },
        { header: 'metadata_json', key: 'metadata_json', width: 50 },
        { header: 'source', key: 'source', width: 15 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      for (const event of events) {
        worksheet.addRow({
          event_id: event.event_id,
          event_type: event.event_type,
          created_at_utc: event.created_at_utc,
          created_at_local: event.created_at_local,
          partner_id: event.partner_id || '',
          partner_name: event.partner_name || '',
          user_id_hash: event.user_id_hash || '',
          discount_id: event.discount_id || '',
          metadata_json: event.metadata_json,
          source: event.source || '',
        });
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

      return;
    }
  } catch (error: any) {
    console.error('Error exporting events:', error);
    return apiResponse.error(res, 500, 'Failed to export events', error);
  }
});
