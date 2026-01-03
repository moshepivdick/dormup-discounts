'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Loader } from '@/components/ui/loader';
import type { User } from '@supabase/supabase-js';

const INACTIVITY_DAYS = 7;
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check inactivity
        const lastActivity = localStorage.getItem('lastActivityAt');
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity);
          if (elapsed > INACTIVITY_MS) {
            // Session expired due to inactivity
            await supabase.auth.signOut();
            localStorage.removeItem('lastActivityAt');
            if (pathname !== '/login') {
              router.push('/login');
            }
            setUser(null);
            setLoading(false);
            return;
          }
        }
        
        setUser(session.user);
        updateLastActivity();
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    checkSession();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        updateLastActivity();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('lastActivityAt');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router, pathname]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      updateLastActivity();
    };

    // Listen to user interactions
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [user]);

  // Check inactivity periodically (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem('lastActivityAt');
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity);
        if (elapsed > INACTIVITY_MS) {
          supabase.auth.signOut();
          localStorage.removeItem('lastActivityAt');
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      }
    };

    const interval = setInterval(checkInactivity, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [user, supabase.auth, router, pathname]);

  // Protect routes
  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login' || pathname?.startsWith('/auth');
    
    if (!user && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute && pathname === '/login') {
      // Already logged in, redirect to app
      router.push('/app');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

function updateLastActivity() {
  localStorage.setItem('lastActivityAt', Date.now().toString());
}

