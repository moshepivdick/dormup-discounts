'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { studentSignupSchema, studentLoginSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    universityId: formData.get('universityId') as string,
  };

  console.log('[SIGNUP] Starting signup process', { email: rawData.email, universityId: rawData.universityId });

  const parsed = studentSignupSchema.safeParse(rawData);
  if (!parsed.success) {
    console.log('[SIGNUP] Validation failed', parsed.error.flatten().fieldErrors);
    return {
      error: 'Invalid form data',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password, universityId } = parsed.data;
  const emailLower = email.toLowerCase();
  const emailDomain = emailLower.split('@').pop();

  if (!emailDomain) {
    console.log('[SIGNUP] Invalid email format');
    return {
      error: 'Invalid email format',
    };
  }

  try {
    // Validate domain against universities
    console.log('[SIGNUP] Validating university', { universityId });
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      console.log('[SIGNUP] University not found', { universityId });
      return {
        error: 'Invalid university selected',
      };
    }

    // Check if domain matches any of the university's email domains
    const domainMatches = university.emailDomains.some((domain) => {
      const domainLower = domain.toLowerCase();
      return (
        emailDomain === domainLower ||
        emailDomain.endsWith(`.${domainLower}`)
      );
    });

    if (!domainMatches) {
      console.log('[SIGNUP] Domain not supported', { emailDomain, allowedDomains: university.emailDomains });
      return {
        error: "This email domain isn't supported yet.",
        code: 'DOMAIN_NOT_SUPPORTED',
      };
    }

    // Sign up with Supabase Auth
    console.log('[SIGNUP] Calling supabase.auth.signUp', { email: emailLower });
    const { data: authData, error: authError } = await serviceClient.auth.signUp({
      email: emailLower,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    console.log('[SIGNUP] SignUp response', {
      hasUser: !!authData.user,
      userId: authData.user?.id,
      hasSession: !!authData.session,
      sessionId: authData.session?.access_token ? 'present' : 'null',
      error: authError?.message,
    });

    if (authError) {
      console.error('[SIGNUP] Auth error', authError);
      return {
        error: authError.message || 'Failed to create account',
      };
    }

    if (!authData.user) {
      console.error('[SIGNUP] No user created');
      return {
        error: 'Failed to create user',
      };
    }

    // Handle email confirmation case: if session is null, user needs to confirm email
    if (!authData.session) {
      console.log('[SIGNUP] Email confirmation required - session is null');
      // Still create profile, but don't require session
      try {
        console.log('[SIGNUP] Creating profile (email confirmation required)', { userId: authData.user.id });
        await prisma.profile.create({
          data: {
            id: authData.user.id,
            email: emailLower,
            universityId,
            verifiedStudent: false,
            role: 'user',
          },
        });
        console.log('[SIGNUP] Profile created successfully');
      } catch (profileError: any) {
        console.error('[SIGNUP] Profile creation error', profileError);
        // If profile creation fails, user can still confirm email and profile will be created via trigger or on first login
        // Don't fail the signup, just log the error
      }

      return {
        success: true,
        requiresEmailConfirmation: true,
        message: 'Please check your email to confirm your account.',
      };
    }

    // User is immediately authenticated (email confirmation disabled or auto-confirmed)
    console.log('[SIGNUP] User authenticated immediately, creating profile', { userId: authData.user.id });
    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          email: emailLower,
          universityId,
          verifiedStudent: false,
          role: 'user',
        },
      });
      console.log('[SIGNUP] Profile created successfully');
    } catch (profileError: any) {
      console.error('[SIGNUP] Profile creation error', profileError);
      // If profile creation fails due to RLS or other issues, return error
      return {
        error: profileError.message || 'Failed to create profile. Please try again.',
        code: 'PROFILE_CREATION_FAILED',
      };
    }

    return {
      success: true,
      requiresEmailConfirmation: false,
      message: 'Account created successfully!',
    };
  } catch (error: any) {
    console.error('[SIGNUP] Unexpected error', error);
    return {
      error: error.message || 'An error occurred during signup',
    };
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient();

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
  const emailLower = email.toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password,
    });

    if (error) {
      return {
        error: error.message || 'Invalid credentials',
      };
    }

    if (data.user) {
      // Sync verified_student status
      await syncProfileAfterConfirm(data.user.id);
      revalidatePath('/', 'layout');
      redirect('/');
    }

    return {
      error: 'Login failed',
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      error: error.message || 'An error occurred during login',
    };
  }
}

export async function syncProfileAfterConfirm(userId: string) {
  const serviceClient = createServiceRoleClient();

  try {
    const { data: user, error } = await serviceClient.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user:', error);
      return;
    }

    if (user?.user?.email_confirmed_at) {
      await prisma.profile.update({
        where: { id: userId },
        data: { verifiedStudent: true },
      });
    }
  } catch (error) {
    console.error('Error syncing profile:', error);
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}

