'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { studentSignupSchema, studentLoginSchema } from '@/lib/validators';

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
      return {
        error: 'Invalid university selected',
      };
    }

    // Extract email domain
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return {
        error: 'Invalid email address',
      };
    }

    // Check if email domain matches university domains
    const domainMatches = university.emailDomains.some((domain) => {
      const normalizedDomain = domain.toLowerCase();
      const normalizedEmailDomain = emailDomain.toLowerCase();
      
      // Exact match or subdomain match (e.g., studenti.unibo.it matches unibo.it)
      return (
        normalizedEmailDomain === normalizedDomain ||
        normalizedEmailDomain.endsWith('.' + normalizedDomain)
      );
    });

    if (!domainMatches) {
      return {
        error: `Email domain must match one of: ${university.emailDomains.join(', ')}`,
      };
    }

    // Create user in Supabase
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (authError) {
      return {
        error: authError.message || 'Failed to create account',
      };
    }

    if (!authData.user) {
      return {
        error: 'Failed to create account',
      };
    }

    // Create profile using Supabase service role client (bypasses RLS)
    const serviceClient = createServiceRoleClient();
    try {
      // Insert profile using Supabase service role (bypasses RLS)
      const { error: profileError } = await serviceClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase(),
          university_id: universityId,
          verified_student: false,
          role: 'user',
        });

      if (profileError) {
        console.error('Profile creation error:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        });
        // Try to delete the auth user if profile creation fails
        try {
          await serviceClient.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          console.error('Failed to cleanup auth user:', deleteError);
        }
        return {
          error: profileError.message || profileError.details || 'Failed to create profile. Please try again.',
        };
      }
    } catch (profileError: any) {
      console.error('Profile creation error:', profileError);
      
      // Fallback: Try using Prisma (might work if RLS allows service role)
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
        console.error('Prisma profile creation error:', prismaError);
        // Try to delete the auth user if profile creation fails
        try {
          await serviceClient.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          console.error('Failed to cleanup auth user:', deleteError);
        }
        return {
          error: prismaError.message || profileError.message || 'Failed to create profile. Please check your database configuration and RLS policies.',
        };
      }
    }

    return {
      success: true,
      message: 'Account created. Please check your email to verify your account.',
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    return {
      error: error.message || 'Failed to create account',
    };
  }
}

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
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      return {
        error: error.message || 'Invalid credentials',
      };
    }

    if (!data.user) {
      return {
        error: 'Login failed',
      };
    }

    return {
      success: true,
      message: 'Signed in successfully',
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      error: error.message || 'Failed to sign in',
    };
  }
}

export async function syncProfileAfterConfirm(userId: string) {
  try {
    // Update verified_student to true when email is confirmed
    await prisma.profile.update({
      where: { id: userId },
      data: { verifiedStudent: true },
    });
  } catch (error: any) {
    console.error('Profile sync error:', error);
    // Don't throw - this is a background sync
  }
}
