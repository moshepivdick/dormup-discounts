import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/auth-app-router';
import { getUserActivityStats } from '@/lib/stats';

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const stats = await getUserActivityStats(userId);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

