'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';

export default function AppPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    loadUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('lastActivityAt');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <BrandLogo className="text-2xl mb-2" />
                <CardTitle className="text-2xl">Your Account</CardTitle>
              </div>
              <Button onClick={handleSignOut} variant="outline">
                Sign out
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="text-base font-medium text-slate-900">{user?.email}</p>
            </div>
            {profile?.full_name && (
              <div>
                <p className="text-sm text-slate-600">Name</p>
                <p className="text-base font-medium text-slate-900">{profile.full_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-600">Account created</p>
              <p className="text-base font-medium text-slate-900">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

