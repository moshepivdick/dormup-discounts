'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/BrandLogo';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check for active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/login');
          return;
        }
        
        if (!session?.user) {
          console.log('No active session, redirecting to login');
          router.push('/login');
          return;
        }

        setUser(session.user);

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, university_id, verified_student, first_name, last_name')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile load error:', profileError);
        }

        // Extract first name from email if not in profile
        if (profileData && session.user.email) {
          const localPart = session.user.email.split('@')[0];
          const firstPart = localPart.split('.')[0];
          const firstName = firstPart
            ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
            : null;
          setProfile({ ...profileData, first_name: firstName || profileData.first_name });
        } else {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('lastActivityAt');
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get display name - fallback to email prefix if name is missing
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const localPart = user.email.split('@')[0];
      const firstPart = localPart.split('.')[0];
      return firstPart
        ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
        : 'User';
    }
    return 'User';
  };

  // Get user initial for avatar
  const getUserInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const displayName = getDisplayName();
  const isVerified = profile?.verified_student === true;

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Header skeleton */}
          <div className="mb-8 flex items-center justify-between">
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-9 w-24 animate-pulse rounded bg-slate-200" />
          </div>

          {/* Title skeleton */}
          <div className="mb-8">
            <div className="mb-2 h-10 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-80 animate-pulse rounded bg-slate-200" />
          </div>

          {/* Card skeleton */}
          <Card className="shadow-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="mb-2 h-6 w-48 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
              <div className="mt-6 h-12 w-full animate-pulse rounded-lg bg-slate-200" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header Row */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex flex-col">
            <BrandLogo className="text-2xl" />
            <span className="mt-0.5 text-xs text-slate-500">Student discounts</span>
          </Link>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <svg
              className="mr-2 h-4 w-4"
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
            Sign out
          </Button>
        </div>

        {/* Hero / Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your Account
          </h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">
            Manage your DormUp profile and verification status.
          </p>
        </div>

        {/* Main Card */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#014D40] text-xl font-semibold text-white">
                {getUserInitial()}
              </div>
              {/* Greeting and Status */}
              <div className="flex flex-1 items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Welcome, {displayName}!
                  </h2>
                </div>
                {/* Status Badge */}
                <div>
                  {isVerified ? (
                    <Badge className="bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
                      <svg
                        className="mr-1.5 h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Verified Student
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-100">
                      Not verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Info Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-sm text-slate-500">Email</p>
                <p className="text-base font-medium text-slate-900">{user?.email || 'N/A'}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm text-slate-500">Name</p>
                <p className="text-base font-medium text-slate-900">
                  {profile?.first_name || displayName}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm text-slate-500">Status</p>
                <div>
                  {isVerified ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      Verified Student
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Not verified
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm text-slate-500">Account created</p>
                <p className="text-base font-medium text-slate-900">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-4 border-t border-slate-100 pt-8">
              <div className="text-center">
                <Button
                  onClick={() => router.push('/')}
                  className="w-full bg-[#014D40] hover:bg-[#013a30] text-lg font-semibold py-6 px-8 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  <svg
                    className="mr-3 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Перейти в главное меню
                </Button>
              </div>
              <p className="text-center text-sm text-slate-500">
                Начните использовать сервис и ищите скидки для студентов
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

