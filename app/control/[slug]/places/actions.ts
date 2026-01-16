'use server';

import { prisma } from '@/lib/prisma';
import { requireAdminAccess } from '@/lib/admin-guards-app-router';
import { z } from 'zod';
import { adminPlaceCreateSchema } from '@/lib/validators';
import { extractAddressFromDetails } from '@/utils/address';
import { ensureUniqueSlug, slugify } from '@/lib/slug';

type CreatePlaceInput = z.input<typeof adminPlaceCreateSchema>;
type CreatePlaceData = z.output<typeof adminPlaceCreateSchema>;

type FieldErrors = Partial<Record<keyof CreatePlaceInput, string>>;

type CreatePlaceResult =
  | { success: true; placeId: number; slug: string }
  | { success: false; fieldErrors?: FieldErrors; formError?: string };

const toFieldErrors = (errors: Record<string, string[] | undefined>): FieldErrors => {
  return Object.entries(errors).reduce<FieldErrors>((acc, [key, messages]) => {
    if (messages && messages.length > 0) {
      acc[key as keyof CreatePlaceInput] = messages[0];
    }
    return acc;
  }, {});
};

const findDuplicateByNameAndAddress = async (
  name: string,
  address: string,
): Promise<boolean> => {
  const candidates = await prisma.venue.findMany({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      details: true,
    },
  });

  const normalizedAddress = address.trim().toLowerCase();
  return candidates.some((venue) => {
    const existingAddress = extractAddressFromDetails(venue.details);
    return existingAddress?.trim().toLowerCase() === normalizedAddress;
  });
};

const generateUniqueSlugFromName = async (name: string): Promise<string> => {
  const existingNames = await prisma.venue.findMany({
    select: {
      name: true,
    },
  });
  const existingSlugs = new Set(existingNames.map((item) => slugify(item.name)));
  const baseSlug = slugify(name);
  return ensureUniqueSlug(baseSlug, existingSlugs);
};

const buildDetailsWithAddress = (address: string): string => {
  return `Address: ${address.trim()}.`;
};

export async function createPlace(
  slug: string,
  input: CreatePlaceInput,
): Promise<CreatePlaceResult> {
  await requireAdminAccess(slug);

  const parsed = adminPlaceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: 'Please fix the highlighted fields.',
    };
  }

  const data: CreatePlaceData = parsed.data;
  const normalizedName = data.name.trim();
  const normalizedAddress = data.address.trim();

  const isDuplicate = await findDuplicateByNameAndAddress(normalizedName, normalizedAddress);
  if (isDuplicate) {
    return {
      success: false,
      fieldErrors: {
        address: 'A place with the same name and address already exists.',
      },
    };
  }

  const uniqueSlug = await generateUniqueSlugFromName(normalizedName);

  const venue = await prisma.venue.create({
    data: {
      name: normalizedName,
      city: data.city.trim(),
      category: data.category,
      discountText: data.about.trim(),
      details: buildDetailsWithAddress(normalizedAddress),
      phone: data.phone ?? null,
      mapUrl: data.mapUrl ?? null,
      latitude: data.latitude,
      longitude: data.longitude,
      isActive: data.status === 'published',
    },
  });

  return {
    success: true,
    placeId: venue.id,
    slug: uniqueSlug,
  };
}
