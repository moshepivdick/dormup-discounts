import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear admin_gate cookie
    cookieStore.delete('admin_gate');

    return NextResponse.json({
      success: true,
      message: 'Admin session cleared',
    });
  } catch (error) {
    console.error('Error clearing admin session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

