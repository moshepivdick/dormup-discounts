import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { MobileNav } from '@/components/navigation/MobileNav';
import { BrandLogo } from '@/components/BrandLogo';
import DormUpIcon from '@/components/DormUp_App_icon-removebg-preview.png';
import type { VenueSummary } from '@/types';
import { SearchBar } from '@/components/SearchBar';

type Props = {
  children: ReactNode;
  searchBarVenues?: VenueSummary[];
};

const links = [
  { href: '/', label: 'Home' },
];

export function SiteLayout({ children, searchBarVenues }: Props) {
  const router = useRouter();

  const emitSearchChange = (value: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('dormup:search-change', { detail: value }),
    );
  };

  const emitSelectVenue = (venue: VenueSummary) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('dormup:search-select', { detail: venue }),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-semibold text-emerald-700"
            aria-label="DormUp Discounts home"
          >
            <Image
              src={DormUpIcon}
              alt="DormUp logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <span>Dorm
            <span className="text-[#990000]">Up </span>
            Discounts</span>
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-4 text-sm font-medium text-slate-600">
            <div className="hidden items-center gap-6 md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition hover:text-emerald-600 ${
                    router.pathname === link.href ? 'text-emerald-600' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {searchBarVenues ? (
              <SearchBar
                venues={searchBarVenues}
                onSearchChange={emitSearchChange}
                onSelectVenue={emitSelectVenue}
              />
            ) : null}
          </nav>
        </div>
      </header>
      <main className="pb-24">{children}</main>
      <MobileNav />
    </div>
  );
}

