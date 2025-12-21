'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { studentSignupSchema, studentLoginSchema } from '@/lib/validators';

/**
 * Sign up a new student user
 */
export async function signup(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    universityId: formData.get('universityId') as string,
  };

  const parsed = studentSignupSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: 'Invalid form data',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password, universityId } = parsed.data;

  try {
    // Validate universityId is provided
    if (!universityId || universityId.trim() === '') {
      return { error: 'Please select a university' };
    }

    // Verify university exists
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      return { error: 'Invalid university selected. Please refresh the page and try again.' };
    }

    // Check email domain matches university
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return { error: 'Invalid email address' };
    }

    const domainMatches = university.emailDomains.some((domain) => {
      const normalizedDomain = domain.toLowerCase();
      return (
        emailDomain === normalizedDomain ||
        emailDomain.endsWith(`.${normalizedDomain}`)
      );
    });

    if (!domainMatches) {
      return {
        error: `Email domain must match ${university.name}. Allowed domains: ${university.emailDomains.join(', ')}`,
      };
    }

    // Create user in Supabase Auth
    const supabase = await createClient();
    
    // Build redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailRedirectTo = `${appUrl}/auth/callback`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (authError) {
      console.error('Supabase signup error:', authError);
      
      // Handle specific email sending errors
      if (authError.message.toLowerCase().includes('email') || 
          authError.message.toLowerCase().includes('sending') ||
          authError.message.toLowerCase().includes('confirmation')) {
        return { 
          error: `Email configuration error: ${authError.message}. Please check SMTP settings in Supabase Dashboard. See SUPABASE_SMTP_SETUP_COMPLETE.md for setup instructions.`
        };
      }
      
      // Handle other errors
      return { error: authError.message };
    }

    if (!authData.user) {
      console.error('No user created in Supabase');
      return { error: 'Failed to create user. Please try again.' };
    }

    // User created successfully
    // Note: Even if email sending fails, the user is still created
    // We proceed with profile creation anyway
    console.log('User created successfully:', authData.user.id);

    // Create profile using Supabase service role client (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();
    try {
      // First, try to create via Supabase service role (bypasses RLS completely)
      const { error: supabaseError } = await serviceSupabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase(),
          university_id: universityId, // snake_case for Supabase
          verified_student: false,
          role: 'user',
        });

      if (supabaseError) {
        console.error('Supabase profile creation error:', supabaseError);
        
        // If Supabase fails, try Prisma as fallback
        // Prisma uses DIRECT_URL which might bypass RLS depending on connection
        try {
          await prisma.profile.create({
            data: {
              id: authData.user.id,
              email: email.toLowerCase(),
              universityId,
              verifiedStudent: false,
              role: 'user',
            },
          });
        } catch (prismaError: any) {
          // If both fail, throw the original Supabase error
          throw supabaseError;
        }
      }
    } catch (profileError: any) {
      console.error('Profile creation error:', profileError);
      console.error('Error details:', {
        code: profileError.code,
        message: profileError.message,
        meta: profileError.meta,
      });
      
      // If profile creation fails, try to clean up auth user
      if (authData.user) {
        try {
          await serviceSupabase.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          console.error('Failed to delete auth user:', deleteError);
        }
      }
      
      // Provide more specific error message
      if (profileError.code === 'P2002' || profileError.message?.includes('unique constraint')) {
        return { error: 'This email is already registered. Please sign in instead.' };
      }
      if (profileError.code === 'P2003' || profileError.message?.includes('foreign key')) {
        return { error: 'Invalid university selected. Please refresh the page and try again.' };
      }
      
      return { 
        error: `Failed to create profile. ${profileError.message || 'Please try again or contact support.'}` 
      };
    }

    // Success - redirect happens via Next.js
    return { success: true };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { error: error.message || 'Failed to sign up' };
  }
}

/**
 * Login a student user
 */
export async function login(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = studentLoginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: 'Invalid form data',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Login failed' };
    }

    // Sync verified_student status
    await syncProfileAfterConfirm(data.user.id);

    // Success - redirect happens via Next.js
    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error.message || 'Failed to log in' };
  }
}

/**
 * Sync profile after email confirmation
 * Updates verified_student status based on email confirmation
 */
export async function syncProfileAfterConfirm(userId: string) {
  try {
    const supabase = createServiceRoleClient();
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user?.user) {
      return { error: 'User not found' };
    }

    // Check if email is confirmed
    const isEmailConfirmed = user.user.email_confirmed_at !== null;

    // Update profile if it exists
    await prisma.profile.updateMany({
      where: { id: userId },
      data: {
        verifiedStudent: isEmailConfirmed,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error syncing profile:', error);
    return { error: 'Failed to sync profile' };
  }
}

/**
 * Ensure user stats record exists
 * Called when user first performs an action
 */
export async function ensureUserStats(userId: string) {
  try {
    await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalDiscountsGenerated: 0,
        totalDiscountsUsed: 0,
        totalVenueViews: 0,
      },
      update: {},
    });
  } catch (error) {
    console.error('Error ensuring user stats:', error);
  }
}
