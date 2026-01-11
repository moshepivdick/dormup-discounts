import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createServiceRoleClient } from '@/lib/supabase/server';

export default withMethods(['GET'], async (req: NextApiRequest, res: NextApiResponse) => {
  // Verify admin or partner
  const admin = await auth.getAdminFromRequest(req);
  const partner = await auth.getPartnerFromRequest(req);

  if (!admin && !partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  const month = req.query.month as string;
  const scope = req.query.scope as string;

  // Build where clause
  const where: any = {};
  if (month) {
    where.month = month;
  }
  if (scope) {
    where.scope = scope;
  }
  if (partner && !admin) {
    // Partners can only see their own snapshots
    where.partner_id = partner.id;
  }

  try {
    const snapshots = await prisma.reportSnapshot.findMany({
      where,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
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
        created_at: 'desc',
      },
      take: 50,
    });

    // Generate signed URLs for each snapshot (only if READY and paths exist)
    const supabase = createServiceRoleClient();
    const snapshotsWithUrls = await Promise.all(
      snapshots.map(async (snapshot) => {
        let pdfUrl: string | null = null;
        let pngUrl: string | null = null;

        if (snapshot.status === 'READY' && snapshot.pdf_path && snapshot.png_path) {
          const { data: pdfData } = await supabase.storage
            .from('reports')
            .createSignedUrl(snapshot.pdf_path, 3600);
          
          const { data: pngData } = await supabase.storage
            .from('reports')
            .createSignedUrl(snapshot.png_path, 3600);

          pdfUrl = pdfData?.signedUrl || null;
          pngUrl = pngData?.signedUrl || null;
        }

        return {
          id: snapshot.id,
          job_id: snapshot.job_id,
          scope: snapshot.scope,
          month: snapshot.month,
          status: snapshot.status,
          created_at: snapshot.created_at,
          completed_at: snapshot.completed_at,
          error_message: snapshot.error_message,
          venue: snapshot.venue,
          partner: snapshot.partner,
          pdf_url: pdfUrl,
          png_url: pngUrl,
        };
      })
    );

    return apiResponse.success(res, snapshotsWithUrls);
  } catch (error: any) {
    console.error('Error fetching snapshots:', error);
    return apiResponse.error(res, 500, 'Failed to fetch snapshots', error);
  }
});
