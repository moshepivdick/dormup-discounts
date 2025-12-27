import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/email-verification';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_token', request.url)
    );
  }

  try {
    // Verify the token
    const userId = await verifyToken(token);

    if (!userId) {
      return NextResponse.redirect(
        new URL('/auth/login?error=expired_token', request.url)
      );
    }

    // Update Supabase auth user email confirmation
    const serviceSupabase = createServiceRoleClient();
    await serviceSupabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    // Update profile to mark as verified
    await prisma.profile.update({
      where: { id: userId },
      data: { verifiedStudent: true },
    });

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL('/auth/login?verified=true', request.url)
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=verification_failed', request.url)
    );
  }
}

