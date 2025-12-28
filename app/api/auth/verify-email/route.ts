import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/email-verification';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  // Get origin from request for proper redirect
  const origin = request.nextUrl.origin;
  const loginUrl = `${origin}/auth/login`;

  if (!token) {
    console.error('Email verification: No token provided');
    return NextResponse.redirect(`${loginUrl}?error=invalid_token`);
  }

  try {
    // Verify the token
    const userId = await verifyToken(token);

    if (!userId) {
      console.error('Email verification: Invalid or expired token');
      return NextResponse.redirect(`${loginUrl}?error=expired_token`);
    }

    // Update Supabase auth user email confirmation
    const serviceSupabase = createServiceRoleClient();
    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      console.error('Email verification: Failed to update Supabase user:', updateError);
      // Continue anyway - we'll update the profile
    }

    // Update profile to mark as verified
    await prisma.profile.update({
      where: { id: userId },
      data: { verifiedStudent: true },
    });

    console.log('Email verification: Success for user', userId);

    // Redirect to login with success message
    return NextResponse.redirect(`${loginUrl}?verified=true`);
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${loginUrl}?error=verification_failed`);
  }
}

