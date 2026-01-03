import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Profile upsert - Auth error:', {
        userError,
        hasUser: !!user,
        errorMessage: userError?.message,
        errorCode: userError?.status,
      });
      return NextResponse.json(
        { error: userError?.message || 'Unauthorized. Please verify your email first.' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { universityId } = body;

    if (!universityId) {
      return NextResponse.json(
        { error: 'University ID is required' },
        { status: 400 }
      );
    }

    // Extract first name from email
    const localPart = user.email.split('@')[0];
    const firstPart = localPart.split('.')[0];
    const firstName = firstPart
      ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
      : null;

    // Upsert profile using Supabase client (RLS allows authenticated users to update their own profile)
    const { data: profileData, error: supabaseError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        university_id: universityId,
        verified_student: true,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (supabaseError || !profileData) {
      console.error('Supabase profile upsert error:', {
        supabaseError,
        hasProfileData: !!profileData,
        userId: user.id,
        email: user.email,
        universityId,
        errorMessage: supabaseError?.message,
        errorCode: supabaseError?.code,
        errorDetails: supabaseError?.details,
        errorHint: supabaseError?.hint,
      });
      
      // Try using service role client to bypass RLS (for first-time profile creation)
      try {
        const serviceClient = createServiceRoleClient();
        const { data: serviceProfileData, error: serviceError } = await serviceClient
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email.toLowerCase(),
            university_id: universityId,
            verified_student: true,
          }, {
            onConflict: 'id',
          })
          .select()
          .single();

        if (serviceError || !serviceProfileData) {
          console.error('Service role profile upsert error:', serviceError);
          // Fallback to Prisma
          const profile = await prisma.profile.upsert({
            where: { id: user.id },
            create: {
              id: user.id,
              email: user.email.toLowerCase(),
              university_id: universityId,
              verified_student: true,
            },
            update: {
              email: user.email.toLowerCase(),
              university_id: universityId,
              verified_student: true,
            },
          });
          console.log('Profile created via Prisma fallback:', profile.id);
          return NextResponse.json({
            success: true,
            profile: {
              id: profile.id,
              email: profile.email,
              first_name: firstName,
              university_id: profile.university_id || universityId,
              is_student_verified: profile.verified_student || true,
            },
          });
        }

        console.log('Profile created via service role client:', serviceProfileData.id);
        return NextResponse.json({
          success: true,
          profile: {
            id: serviceProfileData.id,
            email: serviceProfileData.email,
            first_name: firstName,
            university_id: serviceProfileData.university_id || universityId,
            is_student_verified: serviceProfileData.verified_student || true,
          },
        });
      } catch (fallbackError: any) {
        console.error('All profile creation methods failed:', fallbackError);
        throw new Error(supabaseError?.message || fallbackError?.message || 'Failed to upsert profile');
      }
    }

    const profile = profileData;

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        first_name: firstName,
        university_id: profile.university_id || universityId,
        is_student_verified: profile.verified_student || true,
      },
    });
  } catch (error: any) {
    console.error('Profile upsert error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

