'use server';

import { prisma } from '@/lib/prisma';
import { requireAdminAccess } from '@/lib/admin-guards-app-router';
import { z } from 'zod';
import { adminPlaceCreateSchema } from '@/lib/validators';
import { extractAddressFromDetails, removeAddressFromDetails } from '@/utils/address';
import { ensureUniqueSlug, slugify } from '@/lib/slug';

type CreatePlaceInput = z.input<typeof adminPlaceCreateSchema>;
type CreatePlaceData = z.output<typeof adminPlaceCreateSchema>;

type FieldErrors = Partial<Record<keyof CreatePlaceInput, string>>;

type CreatePlaceResult =
  | { success: true; placeId: number; slug: string }
  | { success: false; fieldErrors?: FieldErrors; formError?: string };

type UpdatePlaceResult =
  | { success: true; placeId: number }
  | { success: false; fieldErrors?: FieldErrors; formError?: string };

type DeletePlaceResult =
  | { success: true }
  | { success: false; formError?: string };

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
  excludeId?: number,
): Promise<boolean> => {
  const candidates = await prisma.venue.findMany({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
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

const mergeDetailsWithAddress = (existingDetails: string | null, address: string): string => {
  const cleaned = removeAddressFromDetails(existingDetails)?.trim();
  if (cleaned) {
    return `${cleaned} Address: ${address.trim()}.`;
  }
  return buildDetailsWithAddress(address);
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
      imageUrl: data.imageUrl ?? null,
      openingHours: data.openingHours ?? null,
      openingHoursShort: data.openingHoursShort ?? null,
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

export async function updatePlace(
  slug: string,
  placeId: number,
  input: CreatePlaceInput,
): Promise<UpdatePlaceResult> {
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

  const existingVenue = await prisma.venue.findUnique({
    where: { id: placeId },
    select: {
      id: true,
      details: true,
      thumbnailUrl: true,
    },
  });

  if (!existingVenue) {
    return { success: false, formError: 'Venue not found.' };
  }

  const isDuplicate = await findDuplicateByNameAndAddress(
    normalizedName,
    normalizedAddress,
    placeId,
  );
  if (isDuplicate) {
    return {
      success: false,
      fieldErrors: {
        address: 'A place with the same name and address already exists.',
      },
    };
  }

  await prisma.venue.update({
    where: { id: placeId },
    data: {
      name: normalizedName,
      city: data.city.trim(),
      category: data.category,
      discountText: data.about.trim(),
      details: mergeDetailsWithAddress(existingVenue.details, normalizedAddress),
      phone: data.phone ?? null,
      mapUrl: data.mapUrl ?? null,
      imageUrl: data.imageUrl ?? null,
      thumbnailUrl: existingVenue.thumbnailUrl,
      openingHours: data.openingHours ?? null,
      openingHoursShort: data.openingHoursShort ?? null,
      latitude: data.latitude,
      longitude: data.longitude,
      isActive: data.status === 'published',
    },
  });

  return { success: true, placeId };
}

export async function deletePlace(
  slug: string,
  placeId: number,
): Promise<DeletePlaceResult> {
  await requireAdminAccess(slug);

  const venue = await prisma.venue.findUnique({
    where: { id: placeId },
    select: { id: true },
  });

  if (!venue) {
    return { success: false, formError: 'Venue not found.' };
  }

  try {
    await prisma.$transaction([
      prisma.partner.deleteMany({ where: { venueId: placeId } }),
      prisma.discountUse.deleteMany({ where: { venueId: placeId } }),
      prisma.venueView.deleteMany({ where: { venueId: placeId } }),
      prisma.dailyPartnerMetrics.deleteMany({ where: { venue_id: placeId } }),
      prisma.monthlyPartnerMetrics.deleteMany({ where: { venue_id: placeId } }),
      prisma.reportSnapshot.deleteMany({ where: { venue_id: placeId } }),
      prisma.userPlaceStats.deleteMany({ where: { place_id: placeId } }),
      prisma.venue.delete({ where: { id: placeId } }),
    ]);
  } catch (error) {
    console.error('Error deleting venue with relations:', error);
    return { success: false, formError: 'Unable to delete place. Check related records.' };
  }

  return { success: true };
}
