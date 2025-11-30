import type { ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';

type DiscountUseRow = {
  id: number;
  code: string;
  status: string;
  venueName: string;
  createdAt: string;
};

type AdminDiscountUsesProps = {
  rows: DiscountUseRow[];
};

export default function AdminDiscountUses({ rows }: AdminDiscountUsesProps) {
  return (
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
  );
}

AdminDiscountUses.getLayout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

export const getServerSideProps = (async (
  ctx,
) => {
  const guard = await requireAdmin(ctx);
  if ('redirect' in guard) {
    return guard;
  }

  const uses = await prisma.discountUse.findMany({
    include: { venue: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return {
    props: {
      rows: uses.map((use) => ({
        id: use.id,
        code: use.generatedCode,
        status: use.status,
        venueName: use.venue.name,
        createdAt: use.createdAt.toISOString(),
      })),
    },
  };
}) as GetServerSideProps<AdminDiscountUsesProps>;

