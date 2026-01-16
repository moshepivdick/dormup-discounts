import { AdminVenuesPageClient } from './page-client';
import { requireAdminAccess } from '@/lib/admin-guards-app-router';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminVenuesPage({ params }: PageProps) {
  const { slug } = await params;
  await requireAdminAccess(slug);
  return <AdminVenuesPageClient slug={slug} />;
}

