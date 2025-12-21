'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

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
