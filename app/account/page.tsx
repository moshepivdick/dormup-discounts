'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/BrandLogo';
import { Loader } from '@/components/ui/loader';

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
          router.push('/(auth)/login');
          return;
        }
        
        if (!session?.user) {
          console.log('No active session, redirecting to login');
          router.push('/(auth)/login');
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
        router.push('/(auth)/login');
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
      router.push('/(auth)/login');
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader size="lg" className="mx-auto mb-4" />
          <p className="text-slate-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const displayName = getDisplayName();
  const isVerified = profile?.verified_student === true;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Top Header Row */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <BrandLogo className="text-2xl" />
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

        {/* Page Title and Subtitle */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your Account
          </h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">
            Manage your DormUp profile
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Welcome, {displayName}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-600">Email</p>
                <p className="text-base font-semibold text-slate-900">{user?.email || 'N/A'}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-600">Name</p>
                <p className="text-base font-semibold text-slate-900">
                  {profile?.first_name || displayName}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-600">Status</p>
                <div>
                  {isVerified ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      <svg
                        className="mr-1 h-3 w-3"
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
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Not verified
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-600">Account created</p>
                <p className="text-base font-semibold text-slate-900">
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

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button
                asChild
                className="flex-1 bg-[#014D40] hover:bg-[#013a30]"
                size="lg"
              >
                <Link href="/">
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Explore discounts
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

