'use server';

import { prisma } from '@/lib/prisma';

export async function getUniversities() {
  try {
    const universities = await prisma.university.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      universities,
    };
  } catch (error: any) {
    console.error('Get universities error:', error);
    return {
      error: 'Failed to load universities',
      universities: [],
    };
  }
}
