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

  const parsed = studentSignupSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: 'Invalid form data',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password, universityId } = parsed.data;
  const emailLower = email.toLowerCase();
  const emailDomain = emailLower.split('@').pop();

  if (!emailDomain) {
    return {
      error: 'Invalid email format',
    };
  }

  try {
    // Validate domain against universities
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
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
      return {
        error: "This email domain isn't supported yet.",
        code: 'DOMAIN_NOT_SUPPORTED',
      };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await serviceClient.auth.signUp({
      email: emailLower,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (authError) {
      return {
        error: authError.message || 'Failed to create account',
      };
    }

    if (!authData.user) {
      return {
        error: 'Failed to create user',
      };
    }

    // Create profile (using service role to bypass RLS)
    await prisma.profile.create({
      data: {
        id: authData.user.id,
        email: emailLower,
        universityId,
        verifiedStudent: false,
        role: 'user',
      },
    });

    return {
      success: true,
      message: 'Account created! Please check your email to confirm.',
    };
  } catch (error: any) {
    console.error('Signup error:', error);
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

