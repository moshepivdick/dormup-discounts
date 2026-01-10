'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

// Force dynamic rendering since this page uses client-side navigation
export const dynamic = 'force-dynamic';

export default function AppPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to /account page (new design with button)
    router.replace('/account');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-slate-600">Перенаправление...</p>
      </div>
    </div>
  );
}

