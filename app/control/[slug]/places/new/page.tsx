import { AdminLayout } from '@/components/admin/AdminLayoutApp';
import { PlaceForm } from '@/components/admin/PlaceForm';
import { requireAdminAccess } from '@/lib/admin-guards-app-router';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NewPlacePage({ params }: PageProps) {
  const { slug } = await params;
  await requireAdminAccess(slug);

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-6 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">New place</p>
          <h2 className="text-2xl font-semibold">Create a venue</h2>
          <p className="text-sm text-white/60">
            Add a new venue and publish it when ready.
          </p>
        </div>
        <PlaceForm slug={slug} />
      </div>
    </AdminLayout>
  );
}
