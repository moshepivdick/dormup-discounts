import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const venueViewSchema = z.object({
  venueId: z.number().int(),
  city: z.string(),
  userAgent: z.string().optional(),
});

/**
 * Generate a deterministic dedupe_key for a view event.
 * Format: venueId:userId:minuteBucket
 * - venueId: the venue being viewed
 * - userId: the user ID or 'anon' for anonymous
 * - minuteBucket: timestamp rounded to the nearest minute (YYYY-MM-DD HH24:MI:00)
 * 
 * This ensures that within a 1-minute window, the same user viewing the same venue
 * will generate the same dedupe_key, allowing us to use upsert to prevent duplicates.
 * 
 * Format matches SQL DATE_TRUNC format: 'YYYY-MM-DD HH24:MI:SS'
 */
function generateDedupeKey(venueId: number, userId: string | null, timestamp: Date = new Date()): string {
  // Round to minute by zeroing seconds and milliseconds
  const rounded = new Date(timestamp);
  rounded.setSeconds(0, 0);
  
  // Format as YYYY-MM-DD HH24:MI:00 (matching PostgreSQL DATE_TRUNC format)
  const year = rounded.getUTCFullYear();
  const month = String(rounded.getUTCMonth() + 1).padStart(2, '0');
  const day = String(rounded.getUTCDate()).padStart(2, '0');
  const hour = String(rounded.getUTCHours()).padStart(2, '0');
  const minute = String(rounded.getUTCMinutes()).padStart(2, '0');
  const minuteBucket = `${year}-${month}-${day} ${hour}:${minute}:00`;
  
  const userIdPart = userId || 'anon';
  return `${venueId}:${userIdPart}:${minuteBucket}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const parsed = venueViewSchema.safeParse({
      ...body,
      userAgent,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { venueId, city, userAgent: parsedUserAgent } = parsed.data;

    // Get user from Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Generate dedupe_key for idempotency (if column exists)
    const now = new Date();
    const dedupeKey = generateDedupeKey(venueId, userId, now);

    // Try to create with dedupe_key first (if column exists after migration)
    // Fallback to simple create if column doesn't exist yet
    try {
      // Use type assertion to bypass TypeScript check - field exists in DB schema but
      // Prisma Client types might not be fully updated until after migration is applied
      await prisma.venueView.create({
        data: {
          venueId,
          city,
          userAgent: parsedUserAgent,
          user_id: userId,
          dedupe_key: dedupeKey,
        } as any,
      });
    } catch (createError: any) {
      // If dedupe_key column doesn't exist (P2022 = column not found)
      if (
        createError?.code === 'P2022' &&
        (createError?.meta?.column === 'VenueView.dedupe_key' ||
          createError?.meta?.column?.includes('dedupe_key'))
      ) {
        // Column doesn't exist yet - create without dedupe_key (backward compatibility)
        await prisma.venueView.create({
          data: {
            venueId,
            city,
            userAgent: parsedUserAgent,
            user_id: userId,
          },
        });
      } else if (createError?.code === 'P2002') {
        // Unique constraint violation - dedupe_key exists and duplicate found
        // Try to update the most recent view within the same minute window
        try {
          const existing = await prisma.venueView.findFirst({
            where: {
              venueId: venueId,
              user_id: userId,
              createdAt: {
                gte: new Date(now.getTime() - 60000), // Within last minute
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (existing) {
            await prisma.venueView.update({
              where: { id: existing.id },
              data: {
                userAgent: parsedUserAgent,
                createdAt: now,
              },
            });
          }
        } catch {
          // If update fails, ignore - duplicate was already prevented by unique constraint
        }
      } else {
        throw createError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log error but don't expose internal details to client
    console.error('Error tracking venue view:', error);
    
    // If it's a unique constraint violation, it's actually fine (duplicate prevented)
    // Just return success since the view was already recorded
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ ok: true });
    }
    
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}

