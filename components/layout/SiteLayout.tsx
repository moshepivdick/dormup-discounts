import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { MobileNav } from '@/components/navigation/MobileNav';
import { BrandLogo } from '@/components/BrandLogo';
import DormUpIcon from '@/components/DormUp_App_icon-removebg-preview.png';
import type { VenueSummary } from '@/types';
import { SearchBar } from '@/components/SearchBar';
import { AccountMenu } from '@/components/AccountMenu';

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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
          {/* Left: Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0"
            aria-label="DormUp Discounts home"
          >
            <Image
              src={DormUpIcon}
              alt="DormUp logo"
              width={32}
              height={32}
              className="h-6 w-6 flex-shrink-0 object-contain sm:h-8 sm:w-8"
              priority
            />
            <span className="text-xs font-semibold text-emerald-700 sm:text-sm md:text-lg">
              Dorm<span className="text-[#990000]">Up </span>Discounts
            </span>
          </Link>
          {/* Middle: Search */}
          {searchBarVenues ? (
            <div className="flex-1 min-w-0">
              <SearchBar
                venues={searchBarVenues}
                onSearchChange={emitSearchChange}
                onSelectVenue={emitSelectVenue}
              />
            </div>
          ) : null}
          {/* Right: Auth actions */}
          <nav className="flex items-center justify-end gap-3 whitespace-nowrap flex-shrink-0">
            {/* Desktop: Log in + Sign up buttons (for logged-out users) */}
            <div className="hidden sm:flex items-center gap-3">
              <AccountMenu showDesktopButtons={true} />
            </div>
            {/* Mobile: Account icon button */}
            <div className="flex sm:hidden">
              <AccountMenu showDesktopButtons={false} />
            </div>
          </nav>
        </div>
      </header>
      <main className="pb-24">{children}</main>
      <MobileNav />
    </div>
  );
}

