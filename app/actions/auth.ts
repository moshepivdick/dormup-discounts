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
    // Verify university exists
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      return { error: 'Invalid university selected' };
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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Failed to create user' };
    }

    // Create profile using service role (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();
    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          email: email.toLowerCase(),
          universityId,
          verifiedStudent: false, // Will be set to true after email confirmation
          role: 'user',
        },
      });
    } catch (profileError: any) {
      // If profile creation fails, try to clean up auth user
      if (authData.user) {
        await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      }
      return { error: 'Failed to create profile. Please try again.' };
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
