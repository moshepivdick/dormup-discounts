import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const venueViewSchema = z.object({
  venueId: z.number().int(),
  city: z.string(),
  userAgent: z.string().optional(),
});

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
        { error: 'Invalid payload', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { venueId, city, userAgent: parsedUserAgent } = parsed.data;

    // Get user from Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Create venue view with user_id if available
    await prisma.venueView.create({
      data: {
        venueId,
        city,
        userAgent: parsedUserAgent,
        user_id: userId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error tracking venue view:', error);
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}

