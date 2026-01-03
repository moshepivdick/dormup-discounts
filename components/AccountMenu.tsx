'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

type User = {
  id: string;
  email: string;
  verifiedStudent: boolean;
  university: {
    id: string;
    name: string;
    city: string;
  } | null;
};

type AccountMenuProps = {
  showDesktopButtons?: boolean;
};

export function AccountMenu({ showDesktopButtons = false }: AccountMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/user/current')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setOpen(false);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (!user) {
    // Desktop: Show buttons directly
    if (showDesktopButtons) {
      return (
        <>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-600 transition hover:text-emerald-600 px-2 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Sign up
          </Link>
        </>
      );
    }
    
    // Mobile: Show icon with popover
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 transition hover:text-emerald-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Account"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        </PopoverTrigger>
        {open && (
          <PopoverContent className="w-56 max-w-[calc(100vw-16px)] min-w-0 p-2" align="end" sideOffset={8}>
            <div className="flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-start gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold leading-tight text-white transition hover:bg-emerald-700 whitespace-normal"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span className="break-words">Log in</span>
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-tight text-slate-700 transition hover:bg-slate-50 whitespace-normal"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <span className="break-words">Create account</span>
              </Link>
            </div>
          </PopoverContent>
        )}
      </Popover>
    );
  }

  const initials = user.email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Account menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {initials}
            </div>
            <svg
              className={`h-4 w-4 text-slate-600 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </PopoverTrigger>
        {open && (
          <PopoverContent className="w-56 max-w-[calc(100vw-16px)] min-w-0 p-2" align="end" sideOffset={8}>
            <div className="flex flex-col gap-2">
              <div className="mb-2 border-b border-slate-200 pb-2">
                <p className="text-sm font-semibold text-slate-900 break-words">{user.email}</p>
                {user.university && (
                  <p className="mt-1 text-xs text-slate-500 break-words">
                    {user.university.name}
                  </p>
                )}
                {user.verifiedStudent && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Verified Student
                  </span>
                )}
              </div>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm leading-tight text-slate-700 transition hover:bg-slate-100 whitespace-normal"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="break-words">Profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm leading-tight text-slate-700 transition hover:bg-slate-100 whitespace-normal"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="break-words">Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm leading-tight text-rose-600 transition hover:bg-rose-50 whitespace-normal"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="break-words">Logout</span>
              </button>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}

