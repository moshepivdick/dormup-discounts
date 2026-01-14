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
  // Read request body once at the beginning
  let body: any;
  let venueId: number;
  let city: string;
  let parsedUserAgent: string | undefined;
  let userId: string | null;

  try {
    body = await request.json();
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

    ({ venueId, city, userAgent: parsedUserAgent } = parsed.data);

    // Get user from Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch (parseError) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    // Generate dedupe_key for idempotency (if column exists)
    const now = new Date();
    const dedupeKey = generateDedupeKey(venueId, userId, now);

    // Try to upsert with dedupe_key first (if column exists after migration)
    // Use raw SQL with ON CONFLICT to handle duplicates gracefully
    try {
      // Use raw SQL with ON CONFLICT to handle dedupe_key uniqueness
      // This is more efficient than create + catch P2002
      await prisma.$executeRaw`
        INSERT INTO public.venue_views (venue_id, city, user_agent, user_id, created_at, dedupe_key)
        VALUES (${venueId}, ${city}, ${parsedUserAgent || null}, ${userId}, ${now}, ${dedupeKey})
        ON CONFLICT (dedupe_key) 
        DO UPDATE SET 
          user_agent = EXCLUDED.user_agent,
          created_at = EXCLUDED.created_at
      `;
    } catch (createError: any) {
      // Check if table doesn't exist (P2021 = table not found)
      const isTableMissing = 
        createError?.code === 'P2021' ||
        createError?.code === 'P2010' ||
        (createError?.meta?.table && createError.meta.table.includes('venue_views')) ||
        (createError?.message && (
          createError.message.includes('does not exist') ||
          createError.message.includes('table') ||
          createError.message.includes('venue_views')
        ));

      if (isTableMissing) {
        // Table doesn't exist - this is fine, just return success
        // View tracking is not critical and table will be created by migration
        console.warn('venue_views table does not exist yet, skipping view tracking');
        return NextResponse.json({ ok: true });
      }
      // If dedupe_key column doesn't exist (P2022 = column not found)
      const isDedupeKeyError = 
        createError?.code === 'P2022' &&
        (createError?.meta?.column === 'VenueView.dedupe_key' ||
          createError?.meta?.column === 'dedupe_key' ||
          createError?.meta?.column?.includes('dedupe_key') ||
          String(createError?.meta?.column || '').includes('dedupe_key'));

      if (isDedupeKeyError) {
        // Column doesn't exist yet - use raw SQL to create without dedupe_key
        // This avoids Prisma trying to use the column even if we don't pass it
        try {
          await prisma.$executeRaw`
            INSERT INTO public.venue_views (venue_id, city, user_agent, user_id, created_at)
            VALUES (${venueId}, ${city}, ${parsedUserAgent || null}, ${userId}, ${now})
            ON CONFLICT DO NOTHING
          `;
          // Success - return early
          return NextResponse.json({ ok: true });
        } catch (fallbackError: any) {
          // Check if table doesn't exist (P2010 or 42P01)
          const isTableMissing = 
            fallbackError?.code === 'P2010' || 
            fallbackError?.code === '42P01' ||
            (fallbackError?.message && (
              fallbackError.message.includes('does not exist') ||
              fallbackError.message.includes('relation') ||
              fallbackError.message.includes('venue_views')
            ));
          
          if (isTableMissing) {
            // Table doesn't exist - this is fine, just return success
            // View tracking is not critical and table will be created by migration
            console.warn('venue_views table does not exist yet, skipping view tracking');
            return NextResponse.json({ ok: true });
          }
          
          // If unique constraint violation or any other error, view might already be recorded
          // Return success anyway - view tracking is not critical
          if (fallbackError?.code === 'P2002' || fallbackError?.code === '23505') {
            // View already exists - return success
            return NextResponse.json({ ok: true });
          }
          // Log but don't fail - view tracking is not critical
          console.warn('Raw SQL fallback also failed:', fallbackError?.code, fallbackError?.message?.substring(0, 100));
          return NextResponse.json({ ok: true }); // Return success anyway
        }
      } else if (createError?.code === 'P2002' || createError?.code === '23505') {
        // Unique constraint violation - dedupe_key exists (shouldn't happen with ON CONFLICT, but handle gracefully)
        // This means the view was already recorded, which is fine
        return NextResponse.json({ ok: true });
      } else {
        // Re-throw other errors to be handled by outer catch
        throw createError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    // Log error with structured data for debugging (non-breaking, still returns success)
    console.error('[Analytics] Error tracking venue view:', {
      errorCode: error?.code,
      errorMessage: error?.message?.substring(0, 200),
      venueId,
      userId: userId || 'anon',
      hasTable: error?.meta?.table ? 'yes' : 'unknown',
      hasColumn: error?.meta?.column || null,
    });
    
    // Check if table doesn't exist (P2021 = table not found)
    const isTableMissing = 
      error?.code === 'P2021' ||
      error?.code === 'P2010' ||
      (error?.meta?.table && error.meta.table.includes('venue_views')) ||
      (error?.message && (
        error.message.includes('does not exist') ||
        error.message.includes('table') ||
        error.message.includes('venue_views')
      ));

    if (isTableMissing) {
      // Table doesn't exist - this is fine, just return success
      console.warn('venue_views table does not exist yet, skipping view tracking');
      return NextResponse.json({ ok: true });
    }
    
    // Check if it's a P2022 error for dedupe_key (missed in inner catch)
    const isDedupeKeyError = 
      error?.code === 'P2022' &&
      (error?.meta?.column === 'VenueView.dedupe_key' ||
        error?.meta?.column === 'dedupe_key' ||
        error?.meta?.column?.includes('dedupe_key') ||
        String(error?.meta?.column || '').includes('dedupe_key'));

    if (isDedupeKeyError) {
      // Try one more time using raw SQL (data already parsed above)
      // This avoids Prisma trying to use the column even if we don't pass it
      try {
        await prisma.$executeRaw`
          INSERT INTO public.venue_views (venue_id, city, user_agent, user_id, created_at)
          VALUES (${venueId}, ${city}, ${parsedUserAgent || null}, ${userId}, ${new Date()})
          ON CONFLICT DO NOTHING
        `;
        return NextResponse.json({ ok: true });
      } catch (finalError: any) {
        // Check if table doesn't exist (P2010 or 42P01)
        const isTableMissing = 
          finalError?.code === 'P2010' || 
          finalError?.code === '42P01' ||
          (finalError?.message && (
            finalError.message.includes('does not exist') ||
            finalError.message.includes('relation') ||
            finalError.message.includes('venue_views')
          ));
        
        if (isTableMissing) {
          // Table doesn't exist - this is fine, just return success
          console.warn('venue_views table does not exist yet, skipping view tracking');
          return NextResponse.json({ ok: true });
        }
        
        // If unique constraint violation or any other error, view might already be recorded
        if (finalError?.code === 'P2002' || finalError?.code === '23505') {
          return NextResponse.json({ ok: true });
        }
        // Log but don't fail - view tracking is not critical
        console.warn('[Analytics] Final raw SQL fallback also failed:', {
          errorCode: finalError?.code,
          errorMessage: finalError?.message?.substring(0, 200),
          venueId,
        });
        return NextResponse.json({ ok: true }); // Return success anyway to not break user experience
      }
    }
    
    // If it's a unique constraint violation, it's actually fine (duplicate prevented)
    // Just return success since the view was already recorded
    if (error?.code === 'P2002' || (error instanceof Error && error.message.includes('Unique constraint'))) {
      return NextResponse.json({ ok: true });
    }
    
    // For any other error, return success anyway to not break user experience
    // View tracking is not critical for the app to function
    console.warn('[Analytics] Non-critical view tracking error, returning success:', {
      errorCode: error?.code,
      errorMessage: error?.message?.substring(0, 200),
      venueId,
      userId: userId || 'anon',
    });
    return NextResponse.json({ ok: true });
  }
}

