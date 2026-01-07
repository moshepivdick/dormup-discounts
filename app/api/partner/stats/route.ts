import { NextRequest, NextResponse } from 'next/server';
import { getPartnerFromCookies } from '@/lib/auth-app-router';
import { getPartnerVenueStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check partner auth
    const partner = await getPartnerFromCookies();
    if (!partner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getPartnerVenueStats(partner.venueId);

    return NextResponse.json({ success: true, data: { stats } });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

