import { AdminPartnersPageClient } from './page-client';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminPartnersPage({ params }: PageProps) {
  const { slug } = await params;
  return <AdminPartnersPageClient slug={slug} />;
}

