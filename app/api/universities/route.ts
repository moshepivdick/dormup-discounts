import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        emailDomains: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(universities);
  } catch (error: any) {
    console.error('Error fetching universities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch universities' },
      { status: 500 }
    );
  }
}


