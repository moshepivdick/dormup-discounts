'use server';

import { prisma } from '@/lib/prisma';

export async function getUniversities() {
  try {
    const universities = await prisma.university.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        city: true,
        emailDomains: true,
      },
    });

    return { success: true, data: universities };
  } catch (error: any) {
    console.error('Error fetching universities:', error);
    return { success: false, error: error.message };
  }
}

