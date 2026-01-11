import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/BrandLogo';

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/partners', label: 'Partners' },
  { href: '/admin/discount-uses', label: 'Discounts' },
  { href: '/admin/reports', label: 'Reports' },
];

type Props = {
  children: ReactNode;
};

export function AdminLayout({ children }: Props) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 hidden w-64 border-r border-white/5 bg-slate-900/80 px-6 py-10 sm:block">
        <Link href="/" className="text-lg font-semibold text-emerald-400">
          <BrandLogo /> Admin
        </Link>
        <nav className="mt-8 flex flex-col gap-3">
          {navLinks.map((link) => {
            const active = router.pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-h-screen bg-slate-900/40 px-4 py-6 sm:ml-64 sm:px-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">
            <BrandLogo /> Admin Console
          </h1>
          <Link
            href="/admin/logout"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Log out
          </Link>
        </header>
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40">
          {children}
        </div>
      </div>
    </div>
  );
}

