import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
];

export function MobileNav() {
  const router = useRouter();
  const hideNav = useMemo(() => router.pathname.startsWith('/admin'), [router.pathname]);

  if (hideNav) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 block bg-white/95 pb-safe shadow-2xl shadow-emerald-950/10 sm:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const active = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs font-medium transition ${
                active ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

