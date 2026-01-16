import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';
import { DeletePlaceButton } from '@/components/admin/DeletePlaceButton';
import { PlaceForm, type PlaceFormValues } from '@/components/admin/PlaceForm';
import { VenueCard } from '@/components/VenueCard';
import { requireAdminAccess } from '@/lib/admin-guards-app-router';
import { prisma } from '@/lib/prisma';
import type { VenueCategory } from '@/lib/constants/categories';
import { extractAddressFromDetails } from '@/utils/address';
import type { VenueSummary } from '@/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string; placeId: string }>;
};

export default async function EditPlacePage({ params }: PageProps) {
  const { slug, placeId } = await params;
  await requireAdminAccess(slug);

  const id = Number(placeId);
  if (Number.isNaN(id)) {
    notFound();
  }

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      city: true,
      category: true,
      discountText: true,
      details: true,
      mapUrl: true,
      phone: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      thumbnailUrl: true,
      openingHoursShort: true,
      isActive: true,
      priceLevel: true,
      typicalStudentSpendMin: true,
      typicalStudentSpendMax: true,
    },
  });

  if (!venue) {
    notFound();
  }

  const initialValues: Partial<PlaceFormValues> = {
    name: venue.name,
    category: venue.category as VenueCategory,
    address: extractAddressFromDetails(venue.details) ?? '',
    city: venue.city,
    about: venue.discountText,
    status: venue.isActive ? 'published' : 'draft',
    phone: venue.phone ?? '',
    mapUrl: venue.mapUrl ?? '',
    imageUrl: venue.imageUrl ?? '',
    latitude: String(venue.latitude),
    longitude: String(venue.longitude),
  };

  const preview: VenueSummary = {
    id: venue.id,
    name: venue.name,
    city: venue.city,
    category: venue.category,
    discountText: venue.discountText,
    isActive: venue.isActive,
    imageUrl: venue.imageUrl,
    thumbnailUrl: venue.thumbnailUrl,
    openingHoursShort: venue.openingHoursShort,
    latitude: venue.latitude,
    longitude: venue.longitude,
    priceLevel: venue.priceLevel,
    typicalStudentSpendMin: venue.typicalStudentSpendMin,
    typicalStudentSpendMax: venue.typicalStudentSpendMax,
  };

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Edit place</p>
            <h2 className="text-2xl font-semibold">{venue.name}</h2>
            <p className="text-sm text-white/60">
              Update the venue details and publish when ready.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/control/${slug}/venues`}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10"
            >
              Back to list
            </Link>
            <Link
              href={`/venues/${venue.id}`}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              View page
            </Link>
          </div>
        </div>

        <PlaceForm slug={slug} mode="edit" placeId={venue.id} initialValues={initialValues} />

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Card preview</p>
          <div className="max-w-lg">
            <VenueCard venue={preview} />
          </div>
        </div>

        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-200">Danger zone</p>
          <p className="mt-2 text-sm text-rose-100/80">
            Delete the place and all related data.
          </p>
          <div className="mt-3">
            <DeletePlaceButton slug={slug} placeId={venue.id} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
