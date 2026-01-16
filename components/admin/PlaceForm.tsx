'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  VENUE_CATEGORIES,
  VENUE_CATEGORY_LABELS,
  VENUE_CATEGORY_VALUES,
  type VenueCategory,
} from '@/lib/constants/categories';
import { adminPlaceCreateSchema } from '@/lib/validators';
import { createPlace, updatePlace } from '@/app/control/[slug]/places/actions';

export type PlaceFormValues = {
  name: string;
  category: VenueCategory;
  address: string;
  city: string;
  about: string;
  status: 'draft' | 'published';
  phone: string;
  mapUrl: string;
  imageUrl: string;
  latitude: string;
  longitude: string;
};

type FieldErrors = Partial<Record<keyof PlaceFormValues, string>>;

type PlaceFormProps = {
  slug: string;
  mode?: 'create' | 'edit';
  placeId?: number;
  initialValues?: Partial<PlaceFormValues>;
};

const initialValues: PlaceFormValues = {
  name: '',
  category: VENUE_CATEGORIES.RESTAURANT,
  address: '',
  city: 'Rimini',
  about: '',
  status: 'draft',
  phone: '',
  mapUrl: '',
  imageUrl: '',
  latitude: '',
  longitude: '',
};

const getFirstError = (errors: Record<string, string[] | undefined>): FieldErrors => {
  return Object.entries(errors).reduce<FieldErrors>((acc, [key, messages]) => {
    if (messages && messages.length > 0) {
      acc[key as keyof PlaceFormValues] = messages[0];
    }
    return acc;
  }, {});
};

export function PlaceForm({ slug, mode = 'create', placeId, initialValues: overrides }: PlaceFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<PlaceFormValues>(() => ({
    ...initialValues,
    ...overrides,
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleChange = <K extends keyof PlaceFormValues>(
    key: K,
    value: PlaceFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');

    const parsed = adminPlaceCreateSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(getFirstError(parsed.error.flatten().fieldErrors));
      return;
    }

    startTransition(async () => {
      if (mode === 'edit') {
        if (!placeId) {
          setFormError('Missing place ID.');
          return;
        }
        const result = await updatePlace(slug, placeId, parsed.data);
        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          setFormError(result.formError ?? 'Unable to update place.');
          return;
        }

        setToastMessage('Changes saved');
        router.refresh();
        return;
      }

      const result = await createPlace(slug, parsed.data);
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? 'Unable to create place.');
        return;
      }

      setToastMessage('Place created');
      setTimeout(() => {
        router.push(`/control/${slug}/places/${result.placeId}`);
      }, 700);
    });
  };

  return (
    <div className="relative">
      {toastMessage ? (
        <div className="fixed right-6 top-6 z-50 rounded-2xl border border-emerald-400/40 bg-emerald-500/90 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {toastMessage}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-white/80">
            Name
            <input
              value={values.name}
              onChange={(event) => handleChange('name', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="e.g. Osteria del Campus"
              required
            />
            {fieldErrors.name && <span className="text-xs text-rose-300">{fieldErrors.name}</span>}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            Category
            <select
              value={values.category}
              onChange={(event) => handleChange('category', event.target.value as VenueCategory)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              required
            >
              {VENUE_CATEGORY_VALUES.map((category) => (
                <option key={category} value={category}>
                  {VENUE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <span className="text-xs text-rose-300">{fieldErrors.category}</span>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            Address
            <input
              value={values.address}
              onChange={(event) => handleChange('address', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="Via Roma, 10"
              maxLength={500}
              required
            />
            {fieldErrors.address && (
              <span className="text-xs text-rose-300">{fieldErrors.address}</span>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            City
            <input
              value={values.city}
              onChange={(event) => handleChange('city', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              required
            />
            {fieldErrors.city && <span className="text-xs text-rose-300">{fieldErrors.city}</span>}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80 lg:col-span-2">
            About (discount text)
            <textarea
              value={values.about}
              onChange={(event) => handleChange('about', event.target.value)}
              className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="e.g. 10% off for DormUp students"
              required
            />
            {fieldErrors.about && <span className="text-xs text-rose-300">{fieldErrors.about}</span>}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            Status
            <select
              value={values.status}
              onChange={(event) =>
                handleChange('status', event.target.value as PlaceFormValues['status'])
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            {fieldErrors.status && (
              <span className="text-xs text-rose-300">{fieldErrors.status}</span>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            Phone (optional)
            <input
              value={values.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="+39 0541 000000"
            />
            {fieldErrors.phone && <span className="text-xs text-rose-300">{fieldErrors.phone}</span>}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80 lg:col-span-2">
            Google Maps URL (optional)
            <input
              value={values.mapUrl}
              onChange={(event) => handleChange('mapUrl', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="https://maps.google.com/..."
            />
            {fieldErrors.mapUrl && <span className="text-xs text-rose-300">{fieldErrors.mapUrl}</span>}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80 lg:col-span-2">
            Photo URL (optional)
            <input
              value={values.imageUrl}
              onChange={(event) => handleChange('imageUrl', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="https://images.example.com/venue.jpg"
              maxLength={5000}
            />
            {fieldErrors.imageUrl && (
              <span className="text-xs text-rose-300">{fieldErrors.imageUrl}</span>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            Latitude
            <input
              type="number"
              step="0.000001"
              value={values.latitude}
              onChange={(event) => handleChange('latitude', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="44.0678"
              required
            />
            {fieldErrors.latitude && (
              <span className="text-xs text-rose-300">{fieldErrors.latitude}</span>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium text-white/80">
            Longitude
            <input
              type="number"
              step="0.000001"
              value={values.longitude}
              onChange={(event) => handleChange('longitude', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="12.5683"
              required
            />
            {fieldErrors.longitude && (
              <span className="text-xs text-rose-300">{fieldErrors.longitude}</span>
            )}
          </label>
        </div>

        {formError ? <p className="mt-4 text-sm text-rose-300">{formError}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Places</p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700"
          >
            {isPending
              ? mode === 'edit'
                ? 'Saving…'
                : 'Creating…'
              : mode === 'edit'
                ? 'Save changes'
                : 'Create place'}
          </button>
        </div>
      </form>
    </div>
  );
}
