import { AdminVenuesPageClient } from './page-client';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminVenuesPage({ params }: PageProps) {
  const { slug } = await params;
  return <AdminVenuesPageClient slug={slug} />;
}

