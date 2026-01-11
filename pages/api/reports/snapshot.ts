import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { parseMonth, getMonthBounds } from '@/lib/reports';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import { generateReportToken, generateReportHash } from '@/lib/report-token';
// Playwright will be imported dynamically to avoid build errors if not installed
import * as crypto from 'crypto';

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin or partner - try both methods
  let admin = await auth.getAdminFromRequest(req);
  let partner = await auth.getPartnerFromRequest(req);
  let isSupabaseAdmin = false;
  let supabaseUserId: string | null = null;

  // If no admin/partner from cookies, try Supabase auth (for App Router)
  if (!admin && !partner) {
    try {
      const supabase = createClientFromRequest(req);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && user) {
        supabaseUserId = user.id;
        // Check if user is admin in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profile?.is_admin) {
          isSupabaseAdmin = true;
          // Try to find admin record by email, but don't require it
          const adminRecord = await prisma.admin.findFirst({
            where: { email: user.email || '' },
          });
          if (adminRecord) {
            admin = adminRecord;
          }
        }
      }
    } catch (error) {
      console.error('Error checking Supabase auth:', error);
    }
  }

  // Allow if admin (from cookie or Supabase), partner, or Supabase admin
  if (!admin && !partner && !isSupabaseAdmin) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  // Parse request body
  const { month, scope, partnerId } = req.body as {
    month?: string;
    scope?: 'admin' | 'partner';
    partnerId?: string;
  };

  // Get month (default to current month)
  let monthStr = month;
  if (!monthStr) {
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;
    monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  }

  // Validate month
  try {
    parseMonth(monthStr);
  } catch (error: any) {
    return apiResponse.error(res, 400, error.message || 'Invalid month format');
  }

  // Determine scope and venue
  let finalScope: 'admin' | 'partner' = scope || ((admin || isSupabaseAdmin) ? 'admin' : 'partner');
  let venueId: number | undefined;
  let partnerIdFinal: string | undefined;

  if (finalScope === 'partner') {
    if ((admin || isSupabaseAdmin) && partnerId) {
      // Admin requesting partner snapshot
      const requestedPartner = await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { id: true, venueId: true },
      });
      if (!requestedPartner) {
        return apiResponse.error(res, 404, 'Partner not found');
      }
      venueId = requestedPartner.venueId;
      partnerIdFinal = requestedPartner.id;
    } else if (partner) {
      // Partner requesting their own
      venueId = partner.venueId;
      partnerIdFinal = partner.id;
    } else {
      return apiResponse.error(res, 400, 'partnerId required for partner scope');
    }
  } else if (finalScope === 'admin' && !admin && !isSupabaseAdmin) {
    return apiResponse.error(res, 403, 'Only admins can create admin snapshots');
  }

  // Generate job_id for tracking
  const jobId = crypto.randomUUID();

  try {
    const timestamp = Date.now();
    const hash = generateReportHash(finalScope, monthStr, venueId);
    
    const pdfPath = `reports/${finalScope}/${monthStr}/${venueId ? `venue-${venueId}` : 'global'}/${timestamp}-${hash}.pdf`;
    const pngPath = `reports/${finalScope}/${monthStr}/${venueId ? `venue-${venueId}` : 'global'}/${timestamp}-${hash}.png`;

    // Compute metrics hash for change detection
    const { year, month: monthNum } = parseMonth(monthStr);
    const { start } = getMonthBounds(year, monthNum);
    
    let metricsHash: string | undefined;
    try {
      if (finalScope === 'admin') {
        const globalMetrics = await prisma.monthlyGlobalMetrics.findUnique({
          where: { period_start: start },
        });
        if (globalMetrics) {
          metricsHash = crypto
            .createHash('md5')
            .update(JSON.stringify(globalMetrics))
            .digest('hex');
        }
      } else if (venueId) {
        const partnerMetrics = await prisma.monthlyPartnerMetrics.findFirst({
          where: {
            venue_id: venueId,
            period_start: start,
          },
        });
        if (partnerMetrics) {
          metricsHash = crypto
            .createHash('md5')
            .update(JSON.stringify(partnerMetrics))
            .digest('hex');
        }
      }
    } catch (metricsError: any) {
      // If metrics tables don't exist, continue without hash
      if (metricsError?.code === 'P2021') {
        console.warn('Metrics tables not found, continuing without metrics hash');
      } else {
        throw metricsError;
      }
    }

    // Create snapshot record with PENDING status
    let snapshot;
    try {
      snapshot = await prisma.reportSnapshot.create({
        data: {
          job_id: jobId,
          scope: finalScope,
          month: monthStr,
          partner_id: partnerIdFinal || null,
          venue_id: venueId || null,
          status: 'PENDING',
          created_by: admin?.id || partner?.id || supabaseUserId || null,
          pdf_path: null,
          png_path: null,
          metrics_hash: metricsHash || null,
        },
      });
    } catch (snapshotError: any) {
      // If ReportSnapshot table doesn't exist, return error with clear instructions
      if (snapshotError?.code === 'P2021') {
        console.error('ReportSnapshot table does not exist. Migrations need to be applied.');
        return apiResponse.error(res, 503, 'Database migrations not applied', {
          error: 'ReportSnapshot table does not exist',
          message: 'Please apply database migrations to enable report creation.',
          instructions: {
            method1: {
              title: 'Via Supabase Dashboard (Recommended)',
              steps: [
                '1. Open Supabase Dashboard → SQL Editor',
                '2. Open file: APPLY_REPORTING_MIGRATIONS.sql',
                '3. Copy and paste all SQL into SQL Editor',
                '4. Click Run to execute',
              ],
            },
            method2: {
              title: 'Via Prisma CLI',
              steps: [
                '1. Ensure DATABASE_URL is set in environment',
                '2. Run: npx prisma migrate deploy',
              ],
            },
          },
          file: 'See APPLY_REPORTING_MIGRATIONS.sql in repository root',
        });
      }
      console.error('Error creating snapshot record:', snapshotError);
      throw snapshotError;
    }

    // Generate PDF and PNG using Playwright
    try {
      // Use Browserless.io for PDF generation (works on Vercel)
      const browserlessToken = process.env.BROWSERLESS_API_TOKEN;
      if (!browserlessToken) {
        await prisma.reportSnapshot.update({
          where: { id: snapshot.id },
          data: {
            status: 'FAILED',
            error_message: 'BROWSERLESS_API_TOKEN not configured',
            completed_at: new Date(),
          },
        });
        return apiResponse.error(res, 503, 'PDF generation not configured', {
          error: 'BROWSERLESS_API_TOKEN environment variable is not set',
          message: 'Please set BROWSERLESS_API_TOKEN in Vercel environment variables.',
        });
      }

      // Generate one-time token for print route
      const printToken = generateReportToken({
        scope: finalScope,
        month: monthStr,
        partnerId: partnerIdFinal,
        venueId,
        userId: admin?.id || partner?.id || supabaseUserId || '',
        type: (admin || isSupabaseAdmin) ? 'admin' : 'partner',
      });

      // Get base URL for print route
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                     'http://localhost:3000');
      
      let printUrl = `${baseUrl}/reports/print?scope=${finalScope}&month=${monthStr}&token=${printToken}`;
      if (partnerIdFinal) {
        printUrl += `&partnerId=${partnerIdFinal}`;
      }

      // Generate PDF using Browserless.io
      const pdfResponse = await fetch(`https://chrome.browserless.io/pdf?token=${browserlessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: printUrl,
          options: {
            format: 'A4',
            printBackground: true,
            margin: {
              top: '1cm',
              right: '1cm',
              bottom: '1cm',
              left: '1cm',
            },
          },
        }),
      });

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        throw new Error(`Browserless PDF generation failed: ${pdfResponse.status} ${errorText}`);
      }

      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

      // Generate PNG thumbnail using Browserless.io screenshot
      const pngResponse = await fetch(`https://chrome.browserless.io/screenshot?token=${browserlessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: printUrl,
          options: {
            fullPage: true,
            type: 'png',
          },
          viewport: {
            width: 1200,
            height: 800,
          },
        }),
      });

      if (!pngResponse.ok) {
        const errorText = await pngResponse.text();
        throw new Error(`Browserless PNG generation failed: ${pngResponse.status} ${errorText}`);
      }

      const pngBuffer = Buffer.from(await pngResponse.arrayBuffer());

      // Upload to Supabase Storage
      const supabase = createServiceRoleClient();
      
      // Check if bucket exists, create if not (with better error message)
      const { error: pdfError } = await supabase.storage
        .from('reports')
        .upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (pdfError) {
        if (pdfError.message?.includes('Bucket not found') || pdfError.message?.includes('bucket')) {
          throw new Error(`PDF upload failed: Bucket 'reports' not found in Supabase Storage. Please create it in Supabase Dashboard → Storage → New bucket (name: 'reports', private). See CREATE_REPORTS_BUCKET.md for instructions.`);
        }
        throw new Error(`PDF upload failed: ${pdfError.message}`);
      }

      const { error: pngError } = await supabase.storage
        .from('reports')
        .upload(pngPath, pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (pngError) {
        if (pngError.message?.includes('Bucket not found') || pngError.message?.includes('bucket')) {
          throw new Error(`PNG upload failed: Bucket 'reports' not found in Supabase Storage. Please create it in Supabase Dashboard → Storage → New bucket (name: 'reports', private). See CREATE_REPORTS_BUCKET.md for instructions.`);
        }
        throw new Error(`PNG upload failed: ${pngError.message}`);
      }

      // Update snapshot to READY
      await prisma.reportSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status: 'READY',
          pdf_path: pdfPath,
          png_path: pngPath,
          completed_at: new Date(),
        },
      });

      // Generate signed URLs (valid for 1 hour)
      const { data: pdfUrl } = await supabase.storage
        .from('reports')
        .createSignedUrl(pdfPath, 3600);
      
      const { data: pngUrl } = await supabase.storage
        .from('reports')
        .createSignedUrl(pngPath, 3600);

      return apiResponse.success(res, {
        snapshotId: snapshot.id,
        jobId: snapshot.job_id,
        status: 'READY',
        snapshot: {
          id: snapshot.id,
          scope: snapshot.scope,
          month: snapshot.month,
          created_at: snapshot.created_at,
          pdf_url: pdfUrl?.signedUrl || null,
          png_url: pngUrl?.signedUrl || null,
        },
      });
    } catch (generationError: any) {
      console.error('Snapshot generation error:', generationError);
      
      // Update snapshot to FAILED
      const errorMessage = generationError.message || 'Generation failed';
      const shortError = errorMessage.length > 100 
        ? errorMessage.substring(0, 97) + '...' 
        : errorMessage;

      await prisma.reportSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status: 'FAILED',
          error_message: shortError,
          completed_at: new Date(),
        },
      });

      // In production, do NOT create placeholder files
      if (process.env.NODE_ENV === 'production') {
        return apiResponse.error(res, 500, 'Snapshot generation failed', {
          snapshotId: snapshot.id,
          jobId: snapshot.job_id,
          status: 'FAILED',
          error: shortError,
        });
      }

      // In development, optionally create placeholders (clearly marked)
      const supabase = createServiceRoleClient();
      const placeholderPdf = Buffer.from(`[DEV PLACEHOLDER] PDF generation failed: ${shortError}`);
      const placeholderPng = Buffer.from(`[DEV PLACEHOLDER] PNG generation failed: ${shortError}`);

      await supabase.storage.from('reports').upload(pdfPath, placeholderPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });
      await supabase.storage.from('reports').upload(pngPath, placeholderPng, {
        contentType: 'image/png',
        upsert: true,
      });

      return apiResponse.error(res, 500, 'Snapshot generation failed (dev placeholder created)', {
        snapshotId: snapshot.id,
        jobId: snapshot.job_id,
        status: 'FAILED',
        error: shortError,
        devMode: true,
      });
    }
  } catch (error: any) {
    console.error('Error creating snapshot:', error);
    
    // Try to update snapshot if it was created
    try {
      const existingSnapshot = await prisma.reportSnapshot.findUnique({
        where: { job_id: jobId },
      });
      if (existingSnapshot) {
        await prisma.reportSnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            status: 'FAILED',
            error_message: error.message?.substring(0, 100) || 'Unknown error',
            completed_at: new Date(),
          },
        });
      }
    } catch (updateError: any) {
      // If table doesn't exist, just log the error
      if (updateError?.code === 'P2021') {
        console.error('ReportSnapshot table does not exist, cannot update status');
      } else {
        console.error('Failed to update snapshot status:', updateError);
      }
    }

    return apiResponse.error(res, 500, 'Failed to create snapshot', error);
  }
});
