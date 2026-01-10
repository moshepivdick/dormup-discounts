import { requireAdminAccess } from '@/lib/admin-guards-app-router';
import { AdminLayout } from '@/components/admin/AdminLayoutApp';
import { prisma } from '@/lib/prisma';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type DiscountUseRow = {
  id: number;
  code: string;
  status: string;
  venueName: string;
  createdAt: string;
};

export default async function AdminDiscountUsesPage({ params }: PageProps) {
  const { slug } = await params;
  
  await requireAdminAccess(slug);

  // Use select instead of include to avoid avgStudentBill column that might not exist
  const uses = await prisma.discountUse.findMany({
    select: {
      id: true,
      generatedCode: true,
      status: true,
      createdAt: true,
      venue: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const rows: DiscountUseRow[] = uses.map((use) => ({
    id: use.id,
    code: use.generatedCode,
    status: use.status,
    venueName: use.venue.name,
    createdAt: use.createdAt.toISOString(),
  }));

  return (
    <AdminLayout slug={slug}>
      <div className="space-y-6 text-white">
        <h2 className="text-xl font-semibold">Discount history</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-white/60">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-semibold">{row.code}</td>
                  <td className="px-4 py-3 text-white/80">{row.venueName}</td>
                  <td className="px-4 py-3 text-white/70">{row.status}</td>
                  <td className="px-4 py-3 text-white/50">{row.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

