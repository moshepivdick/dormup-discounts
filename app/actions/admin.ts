'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export async function verifyAdminPassword(password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check session
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return { success: false, error: 'Not authorized' };
    }

    // Verify password against hash
    const passwordHash = env.adminPanelPasswordHash();
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Set admin_gate cookie
    const cookieStore = await cookies();
    const ttlMinutes = env.adminGateCookieTtlMinutes();
    const maxAge = ttlMinutes * 60; // Convert to seconds

    cookieStore.set('admin_gate', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return { success: false, error: 'Internal server error' };
  }
}

