import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createClientFromRequest } from '@/lib/supabase/pages-router';
import { createServiceRoleClient } from '@/lib/supabase/server';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin authentication
  let admin = await auth.getAdminFromRequest(req);
  let isSupabaseAdmin = false;

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

  try {
    // Get last 20 export jobs
    const jobs = await prisma.exportJob.findMany({
      orderBy: {
        created_at: 'desc',
      },
      take: 20,
    });

    // Add signed URLs for READY jobs
    const supabase = createServiceRoleClient();
    const jobsWithUrls = await Promise.all(
      jobs.map(async (job) => {
        let downloadUrl: string | null = null;

        if (job.status === 'READY' && job.file_path) {
          const { data } = await supabase.storage
            .from('exports')
            .createSignedUrl(job.file_path, 3600); // 1 hour expiry

          downloadUrl = data?.signedUrl || null;
        }

        return {
          id: job.id,
          created_at: job.created_at,
          completed_at: job.completed_at,
          status: job.status,
          format: job.format,
          from_date: job.from_date,
          to_date: job.to_date,
          partner_id: job.partner_id,
          event_types: job.event_types,
          row_count: job.row_count,
          error_message: job.error_message,
          download_url: downloadUrl,
        };
      })
    );

    return apiResponse.success(res, jobsWithUrls);
  } catch (error: any) {
    console.error('Error fetching export jobs:', error);
    return apiResponse.error(res, 500, 'Failed to fetch export jobs', error);
  }
});
