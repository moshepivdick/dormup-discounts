'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { detectLocale } from '@/lib/cookies/consent';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export function Footer() {
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const locale = detectLocale(pathname || '/');

  return (
    <>
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} DormUp Discounts. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link
                href="/privacy"
                className="text-slate-600 transition hover:text-slate-900"
              >
                Privacy Policy
              </Link>
              <button
                onClick={() => setShowModal(true)}
                className="text-slate-600 transition hover:text-slate-900"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        </div>
      </footer>

      <CookiePreferencesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        locale={locale}
      />
    </>
  );
}
