'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          If you don&apos;t have an account yet, create one to continue.
        </p>
        <Link href="/auth/signup" className="mt-6 block">
          <Button type="button" className="w-full">
            Go to registration
          </Button>
        </Link>
      </div>
    </div>
  );
}
