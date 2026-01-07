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
    // Check session - use getUser() for security
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return { success: false, error: 'Not authorized' };
    }

    // Verify password against hash
    let passwordHash: string;
    try {
      // Try to get hash directly from process.env as fallback
      passwordHash = process.env.ADMIN_PANEL_PASSWORD_HASH?.trim() || env.adminPanelPasswordHash();
    } catch (error: any) {
      console.error('Error getting password hash from env:', error.message);
      // Try direct access as last resort
      const directHash = process.env.ADMIN_PANEL_PASSWORD_HASH?.trim();
      if (directHash) {
        console.log('Using direct process.env access for password hash');
        passwordHash = directHash;
      } else {
        return { success: false, error: 'Server configuration error' };
      }
    }
    
    // Debug logging
    console.log('Password verification:', {
      passwordLength: password.length,
      hashLength: passwordHash.length,
      hashPrefix: passwordHash.substring(0, 20),
      hashSuffix: passwordHash.substring(passwordHash.length - 10),
    });
    
    // Check if hash is valid (bcrypt hashes are always 60 characters)
    if (passwordHash.length !== 60) {
      console.error('Invalid hash length:', passwordHash.length, 'Expected: 60');
      console.error('Hash value:', passwordHash);
      return { success: false, error: 'Invalid password configuration' };
    }
    
    // Trim any whitespace that might have been added
    passwordHash = passwordHash.trim();
    
    const isValid = await bcrypt.compare(password.trim(), passwordHash);

    if (!isValid) {
      console.error('Password verification failed - hash does not match password');
      console.error('Password received length:', password.length);
      console.error('Hash length:', passwordHash.length);
      return { success: false, error: 'Invalid password' };
    }
    
    console.log('Password verification successful');

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

