'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePlace } from '@/app/control/[slug]/places/actions';

type DeletePlaceButtonProps = {
  slug: string;
  placeId: number;
};

export function DeletePlaceButton({ slug, placeId }: DeletePlaceButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setError('');
    const confirmed = window.confirm('Delete this place? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deletePlace(slug, placeId);
      if (!result.success) {
        setError(result.formError ?? 'Unable to delete place.');
        return;
      }
      router.push(`/control/${slug}/venues`);
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-full border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed"
      >
        {isPending ? 'Deleting…' : 'Delete place'}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
