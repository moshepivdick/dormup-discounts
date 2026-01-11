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

  // If no admin/partner from cookies, try Supabase auth (for App Router)
  if (!admin && !partner) {
    try {
      const supabase = createClientFromRequest(req);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && user) {
        // Check if user is admin in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profile?.is_admin) {
          // Find admin record by email or create a temporary admin object
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

  if (!admin && !partner) {
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
  let finalScope: 'admin' | 'partner' = scope || (admin ? 'admin' : 'partner');
  let venueId: number | undefined;
  let partnerIdFinal: string | undefined;

  if (finalScope === 'partner') {
    if (admin && partnerId) {
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
  } else if (finalScope === 'admin' && !admin) {
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

    // Create snapshot record with PENDING status
    const snapshot = await prisma.reportSnapshot.create({
      data: {
        job_id: jobId,
        scope: finalScope,
        month: monthStr,
        partner_id: partnerIdFinal || null,
        venue_id: venueId || null,
        status: 'PENDING',
        created_by: admin?.id || partner?.id || null,
        pdf_path: null,
        png_path: null,
        metrics_hash: metricsHash || null,
      },
    });

    // Generate PDF and PNG using Playwright
    try {
      // Dynamic import to avoid build errors if Playwright isn't installed
      // @ts-ignore - Playwright types may not be available during build
      const playwright = await import('playwright');
      const { chromium } = playwright;

      // Generate one-time token for print route
      const printToken = generateReportToken({
        scope: finalScope,
        month: monthStr,
        partnerId: partnerIdFinal,
        venueId,
        userId: admin?.id || partner?.id || '',
        type: admin ? 'admin' : 'partner',
      });

      // Get base URL for print route
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                     'http://localhost:3000');
      
      let printUrl = `${baseUrl}/reports/print?scope=${finalScope}&month=${monthStr}&token=${printToken}`;
      if (partnerIdFinal) {
        printUrl += `&partnerId=${partnerIdFinal}`;
      }

      // Launch Playwright (headless)
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Vercel/serverless
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      // Set viewport for consistent rendering
      await page.setViewportSize({ width: 1200, height: 800 });

      // Navigate to print route
      await page.goto(printUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for fonts and content to be ready
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts && document.fonts.ready);

      // Generate PDF (A4 format, print background)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm',
        },
      });

      // Generate PNG thumbnail (full page screenshot)
      const pngBuffer = await page.screenshot({
        type: 'png',
        fullPage: true,
      });

      await browser.close();

      // Upload to Supabase Storage
      const supabase = createServiceRoleClient();
      
      const { error: pdfError } = await supabase.storage
        .from('reports')
        .upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (pdfError) {
        throw new Error(`PDF upload failed: ${pdfError.message}`);
      }

      const { error: pngError } = await supabase.storage
        .from('reports')
        .upload(pngPath, pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (pngError) {
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
    } catch (updateError) {
      console.error('Failed to update snapshot status:', updateError);
    }

    return apiResponse.error(res, 500, 'Failed to create snapshot', error);
  }
});
