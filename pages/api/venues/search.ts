import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

type SearchResult = {
  id: number;
  name: string;
  city: string;
  category: string;
  thumbnailUrl?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResult[]>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json([]);
  }

  const q = (req.query.q as string)?.trim() || '';

  if (!q) {
    return res.status(200).json([]);
  }

  try {
    const venues = await prisma.venue.findMany({
      where: {
        name: {
          contains: q,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        city: true,
        category: true,
        thumbnailUrl: true,
      },
      take: 8,
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json(venues);
  } catch (error) {
    console.error('Error searching venues:', error);
    return res.status(500).json([]);
  }
}

