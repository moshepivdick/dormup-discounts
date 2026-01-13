import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import * as crypto from 'crypto';
import { stringify } from 'csv-stringify';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MAX_DATE_RANGE_DAYS = env.maxExportDays();
const XLSX_MAX_ROWS = parseInt(process.env.XLSX_MAX_ROWS || '10000', 10);
const CHUNK_SIZE = 2000; // Events per batch query

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
 * Hash user_id for privacy (consistent, irreversible hash with salt)
 */
function hashUserId(userId: string | null): string | null {
  if (!userId) return null;
  const salt = env.exportHashSalt();
  // SHA256 hash with salt, output first 16 chars
  return crypto
    .createHash('sha256')
    .update(userId + salt)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Convert UTC date to Europe/Rome timezone
 */
function toEuropeRome(utcDate: Date): string {
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
 * Query events in chunks using cursor pagination
 */
async function* queryEventsChunked(params: {
  from: Date;
  to: Date;
  partnerId?: string;
  eventTypes?: EventType[];
}): AsyncGenerator<EventRow[], void, unknown> {
  const { from, to, partnerId, eventTypes } = params;

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

  let lastViewId = 0;
  let lastDiscountId = 0;
  let hasMoreViews = true;
  let hasMoreDiscounts = true;

  while (hasMoreViews || hasMoreDiscounts) {
    const chunk: EventRow[] = [];

    // Query VenueView events (PAGE_VIEW) in chunks
    if (hasMoreViews && (!eventTypes || eventTypes.includes('PAGE_VIEW'))) {
      const where: any = {
        createdAt: {
          gte: from,
          lte: to,
        },
        id: { gt: lastViewId },
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
        orderBy: [{ id: 'asc' }],
        take: CHUNK_SIZE,
      });

      for (const view of views) {
        chunk.push({
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
        lastViewId = view.id;
      }

      if (views.length < CHUNK_SIZE) {
        hasMoreViews = false;
      }
    } else {
      hasMoreViews = false;
    }

    // Query DiscountUse events (QR_GENERATED, QR_REDEEMED) in chunks
    if (hasMoreDiscounts && (!eventTypes || eventTypes.includes('QR_GENERATED') || eventTypes.includes('QR_REDEEMED'))) {
      const where: any = {
        createdAt: {
          gte: from,
          lte: to,
        },
        id: { gt: lastDiscountId },
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
        orderBy: [{ id: 'asc' }],
        take: CHUNK_SIZE,
      });

      for (const discount of discountUses) {
        // QR_GENERATED event
        if (!eventTypes || eventTypes.includes('QR_GENERATED')) {
          chunk.push({
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
            chunk.push({
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

        lastDiscountId = discount.id;
      }

      if (discountUses.length < CHUNK_SIZE) {
        hasMoreDiscounts = false;
      }
    } else {
      hasMoreDiscounts = false;
    }

    if (chunk.length > 0) {
      // Sort chunk by created_at_utc before yielding
      chunk.sort((a, b) => a.created_at_utc.localeCompare(b.created_at_utc));
      yield chunk;
    }
  }
}

/**
 * Generate CSV file from events iterator
 */
async function generateCSV(eventsIterator: AsyncGenerator<EventRow[], void, unknown>): Promise<{ filePath: string; rowCount: number }> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `export-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.csv`);
  
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempFile);
    const stringifier = stringify({
      header: true,
      columns: [
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
      ],
    });

    stringifier.pipe(writeStream);

    let rowCount = 0;

    const processChunk = async () => {
      try {
        const { value: chunk, done } = await eventsIterator.next();
        
        if (done) {
          stringifier.end();
          return;
        }

        for (const event of chunk) {
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
          rowCount++;
        }

        // Process next chunk
        processChunk();
      } catch (error) {
        writeStream.close();
        fs.unlinkSync(tempFile);
        reject(error);
      }
    };

    stringifier.on('error', (err) => {
      writeStream.close();
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      reject(err);
    });

    writeStream.on('finish', () => {
      resolve({ filePath: tempFile, rowCount });
    });

    writeStream.on('error', (err) => {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (unlinkErr) {
          // Ignore unlink errors
        }
      }
      reject(err);
    });

    stringifier.on('error', (err) => {
      writeStream.close();
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (unlinkErr) {
          // Ignore unlink errors
        }
      }
      reject(err);
    });

    // Start processing chunks
    processChunk().catch((err) => {
      writeStream.close();
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (unlinkErr) {
          // Ignore unlink errors
        }
      }
      reject(err);
    });
  });
}

/**
 * Generate XLSX file from events iterator
 */
async function generateXLSX(eventsIterator: AsyncGenerator<EventRow[], void, unknown>): Promise<{ filePath: string; rowCount: number }> {
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

  let rowCount = 0;

  // Process all chunks
  for await (const chunk of eventsIterator) {
    for (const event of chunk) {
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
      rowCount++;
    }
  }

  // Write to temp file
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `export-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.xlsx`);
  await workbook.xlsx.writeFile(tempFile);

  return { filePath: tempFile, rowCount };
}

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin authentication
  let admin = await auth.getAdminFromRequest(req);
  let isSupabaseAdmin = false;
  let supabaseUserId: string | null = null;

  // Try Supabase auth if cookie auth fails
  if (!admin) {
    try {
      const supabase = createClientFromRequest(req);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        supabaseUserId = user.id;
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

  // Parse request body
  const { format, from, to, partnerId, types, tz } = req.body as {
    format?: string;
    from?: string;
    to?: string;
    partnerId?: string;
    types?: string[];
    tz?: string;
  };

  // Validate format
  if (!format || (format !== 'csv' && format !== 'xlsx')) {
    return apiResponse.error(res, 400, 'Invalid format. Must be "csv" or "xlsx"');
  }

  // Validate date range
  if (!from || !to) {
    return apiResponse.error(res, 400, 'Missing required parameters: "from" and "to" (YYYY-MM-DD)');
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return apiResponse.error(res, 400, 'Invalid date format. Use YYYY-MM-DD');
  }

  if (fromDate > toDate) {
    return apiResponse.error(res, 400, '"from" date must be before or equal to "to" date');
  }

  // Validate date range length
  const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > MAX_DATE_RANGE_DAYS) {
    return apiResponse.error(res, 400, `Date range exceeds maximum of ${MAX_DATE_RANGE_DAYS} days`);
  }

  // Parse event types
  let eventTypes: EventType[] | undefined;
  if (types && types.length > 0) {
    const validTypes: EventType[] = ['PAGE_VIEW', 'QR_GENERATED', 'QR_REDEEMED'];
    const invalidTypes = types.filter(t => !validTypes.includes(t.toUpperCase() as EventType));
    if (invalidTypes.length > 0) {
      return apiResponse.error(res, 400, `Invalid event types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`);
    }
    eventTypes = types.map(t => t.toUpperCase() as EventType);
  }

  const createdBy = admin?.id || supabaseUserId || null;

  // Create ExportJob with PENDING status
  let exportJob;
  try {
    exportJob = await prisma.exportJob.create({
      data: {
        created_by: createdBy,
        status: 'PENDING',
        scope: 'admin',
        export_type: 'events_raw',
        format: format,
        from_date: fromDate,
        to_date: toDate,
        partner_id: partnerId || null,
        event_types: eventTypes || [],
        filters_json: {
          format,
          from,
          to,
          partnerId: partnerId || null,
          types: eventTypes || [],
          tz: tz || 'Europe/Rome',
        },
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      return apiResponse.error(res, 503, 'ExportJob table does not exist. Please run migration: APPLY_EXPORT_JOB_MIGRATION.sql');
    }
    console.error('Error creating ExportJob:', error);
    return apiResponse.error(res, 500, 'Failed to create export job', error);
  }

  // Generate file and upload asynchronously (don't await in response)
  (async () => {
    let tempFilePath: string | null = null;

    try {
      // Create events iterator
      const eventsIterator = queryEventsChunked({
        from: fromDate,
        to: toDate,
        partnerId,
        eventTypes,
      });

      // Generate file
      let rowCount: number;
      let fileBuffer: Buffer;

      if (format === 'csv') {
        const result = await generateCSV(eventsIterator);
        tempFilePath = result.filePath;
        rowCount = result.rowCount;
        
        // Read file into buffer
        fileBuffer = fs.readFileSync(tempFilePath);
        fs.unlinkSync(tempFilePath); // Clean up temp file
        tempFilePath = null;
      } else {
        // XLSX: Generate and check row count
        const fullIterator = queryEventsChunked({
          from: fromDate,
          to: toDate,
          partnerId,
          eventTypes,
        });

        const result = await generateXLSX(fullIterator);
        tempFilePath = result.filePath;
        rowCount = result.rowCount;

        if (rowCount > XLSX_MAX_ROWS) {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          await prisma.exportJob.update({
            where: { id: exportJob.id },
            data: {
              status: 'FAILED',
              error_message: `XLSX export too large (${rowCount} rows). Maximum is ${XLSX_MAX_ROWS} rows. Use CSV format or narrow the date range.`,
              completed_at: new Date(),
            },
          });
          return;
        }

        // Read file into buffer
        fileBuffer = fs.readFileSync(tempFilePath);
        fs.unlinkSync(tempFilePath); // Clean up temp file
        tempFilePath = null;
      }

      // Generate file path in storage
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const storagePath = `exports/events_raw/${year}-${month}/${exportJob.id}.${format}`;

      // Upload to Supabase Storage
      const supabase = createServiceRoleClient();
      const { error: uploadError } = await supabase.storage
        .from('exports')
        .upload(storagePath, fileBuffer, {
          contentType: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
          throw new Error(`Storage bucket 'exports' not found. Please create it in Supabase Dashboard → Storage → New bucket (name: 'exports', private).`);
        }
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Update job to READY
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: 'READY',
          file_path: storagePath,
          row_count: rowCount,
          completed_at: new Date(),
        },
      });
    } catch (error: any) {
      console.error('Export generation error:', error);
      
      // Update job to FAILED
      const errorMessage = error.message || 'Export generation failed';
      const shortError = errorMessage.length > 200 
        ? errorMessage.substring(0, 197) + '...' 
        : errorMessage;

      try {
        await prisma.exportJob.update({
          where: { id: exportJob.id },
          data: {
            status: 'FAILED',
            error_message: shortError,
            completed_at: new Date(),
          },
        });
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }

      // Clean up temp file if exists
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
    }
  })(); // Fire and forget - job runs async

  // Return immediately with job ID
  return apiResponse.success(res, {
    jobId: exportJob.id,
    status: exportJob.status,
    message: 'Export job created. Poll GET /api/admin/exports/jobs/:id for status.',
  });
});
