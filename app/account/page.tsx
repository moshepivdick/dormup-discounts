'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/BrandLogo';
import type { TopSpot } from '@/app/api/top-spots/route';

// Force dynamic rendering since we use client-side auth checks
export const dynamic = 'force-dynamic';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topSpots, setTopSpots] = useState<TopSpot[]>([]);
  const [topSpotsLoading, setTopSpotsLoading] = useState(true);
  const [topSpotsError, setTopSpotsError] = useState<string | null>(null);

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
          .select('id, email, university_id, verified_student, first_name, last_name, is_admin')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile load error:', profileError);
        }

        // Extract first name from email if not in profile
        if (profileData) {
          if (session.user.email) {
            const localPart = session.user.email.split('@')[0];
            const firstPart = localPart.split('.')[0];
            const firstName = firstPart
              ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
              : null;
            setProfile({ 
              ...profileData, 
              first_name: firstName || profileData.first_name,
              // Ensure verified_student is properly set
              verified_student: profileData.verified_student !== null && profileData.verified_student !== undefined 
                ? profileData.verified_student 
                : false
            });
          } else {
            setProfile({
              ...profileData,
              verified_student: profileData.verified_student !== null && profileData.verified_student !== undefined 
                ? profileData.verified_student 
                : false
            });
          }
        } else {
          // If no profile data, create a minimal profile object
          setProfile({
            id: session.user.id,
            email: session.user.email || '',
            verified_student: false,
            first_name: null,
          });
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

  // Load top spots
  useEffect(() => {
    const loadTopSpots = async () => {
      if (!user) return;
      
      try {
        setTopSpotsLoading(true);
        setTopSpotsError(null);
        const response = await fetch('/api/top-spots');
        if (!response.ok) {
          throw new Error('Failed to fetch top spots');
        }
        const data = await response.json();
        setTopSpots(data.topSpots || []);
      } catch (error) {
        console.error('Error loading top spots:', error);
        setTopSpotsError('Failed to load top spots');
      } finally {
        setTopSpotsLoading(false);
      }
    };

    loadTopSpots();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('lastActivityAt');
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleAdminPanel = async () => {
    try {
      const response = await fetch('/api/admin-link');
      const data = await response.json();
      
      if (data.success && data.url) {
        router.push(data.url);
      } else {
        console.error('Failed to get admin link:', data.error);
      }
    } catch (error) {
      console.error('Error getting admin link:', error);
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

  // Get user initials for avatar: first letter of name, second letter is first letter after dot in email
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    
    const emailLocal = user.email.split('@')[0];
    let firstLetter = '';
    let secondLetter = '';

    // First letter: from name if available, otherwise first letter of email before dot
    const name = getDisplayName();
    if (name && name !== 'User') {
      firstLetter = name.charAt(0).toUpperCase();
    } else {
      const beforeDot = emailLocal.split('.')[0];
      firstLetter = beforeDot.charAt(0).toUpperCase();
    }

    // Second letter: first letter after dot in email
    const dotIndex = emailLocal.indexOf('.');
    if (dotIndex !== -1 && dotIndex < emailLocal.length - 1) {
      secondLetter = emailLocal.charAt(dotIndex + 1).toUpperCase();
    } else {
      // If no dot, use second letter of first part
      const beforeDot = emailLocal.split('.')[0];
      secondLetter = beforeDot.length > 1 ? beforeDot.charAt(1).toUpperCase() : firstLetter;
    }

    return firstLetter + secondLetter;
  };

  const displayName = getDisplayName();
  // Check verified status - handle both boolean and string values
  const isVerified = profile?.verified_student === true || 
                     profile?.verified_student === 'true' || 
                     String(profile?.verified_student) === 'true';

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
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#014D40] text-xl font-semibold text-white ring-4 ring-emerald-500 ring-offset-2">
                {getUserInitials()}
              </div>
              {/* Greeting and Status */}
              <div className="flex flex-1 items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Welcome, {displayName}!
                  </h2>
                </div>
                {/* Status Badge - Green checkmark icon */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <svg
                    className="h-5 w-5 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
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
                  <Badge className="rounded-full bg-[#DFF5E5] px-4 py-1.5 text-sm font-semibold text-[#1E7F4D]">
                    Verified Student
                  </Badge>
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

            {/* Top Spots Section */}
            <div className="mt-8 border-t border-slate-100 pt-8">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Top Spots</h3>
              {topSpotsLoading ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 animate-pulse rounded-lg bg-slate-200" />
                  ))}
                </div>
              ) : topSpotsError ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                  {topSpotsError}
                </div>
              ) : topSpots.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-900">No visits yet</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Start redeeming discounts to see your top spots here
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {topSpots.map((spot) => (
                    <Link
                      key={spot.placeId}
                      href={`/venues/${spot.placeId}`}
                      className="group block overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:border-emerald-500 hover:shadow-md"
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                        {spot.coverImage ? (
                          <Image
                            src={spot.coverImage}
                            alt={spot.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                            <svg
                              className="h-12 w-12 text-emerald-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-emerald-600">
                          {spot.name}
                        </h4>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>
                            {spot.visitsCount} {spot.visitsCount === 1 ? 'visit' : 'visits'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Last visit:{' '}
                          {new Date(spot.lastVisitAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-4 border-t border-slate-100 pt-8">
              {profile?.is_admin && (
                <div className="text-center">
                  <Button
                    onClick={handleAdminPanel}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold py-6 px-8 shadow-lg hover:shadow-xl transition-all"
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Admin Panel
                  </Button>
                </div>
              )}
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
                  Go to Main Menu
                </Button>
              </div>
              <p className="text-center text-sm text-slate-500">
                Start exploring student discounts around you
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

