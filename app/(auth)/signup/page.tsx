'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandLogo } from '@/components/BrandLogo';
import { Loader } from '@/components/ui/loader';

interface University {
  id: string;
  name: string;
  emailDomains: string[];
}

function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch universities
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await fetch('/api/universities');
        if (response.ok) {
          const data = await response.json();
          setUniversities(data);
        }
      } catch (err) {
        console.error('Failed to fetch universities:', err);
      }
    };
    fetchUniversities();
  }, []);

  const validateEmailDomain = (emailToCheck: string, university: University): boolean => {
    const domain = emailToCheck.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    return university.emailDomains.some((allowedDomain) => {
      const normalizedDomain = allowedDomain.toLowerCase();
      const normalizedEmailDomain = domain.toLowerCase();
      
      // Exact match or subdomain match
      return (
        normalizedEmailDomain === normalizedDomain ||
        normalizedEmailDomain.endsWith('.' + normalizedDomain)
      );
    });
  };

  const sendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!selectedUniversity) {
      setError('Please select a university first');
      return;
    }

    // Validate email domain matches selected university
    if (!validateEmailDomain(email, selectedUniversity)) {
      setError(`This email doesn't match ${selectedUniversity.name}. Use your university email.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send OTP - do NOT set emailRedirectTo for OTP-code flow
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (authError) {
        setError(authError.message || 'Failed to send code');
        setLoading(false);
        return;
      }

      // Store email and universityId in localStorage (primary source)
      localStorage.setItem('dormup_auth_email', email.toLowerCase());
      localStorage.setItem('dormup_auth_universityId', selectedUniversity.id);
      
      // Store cooldown timestamp
      localStorage.setItem(`otp_cooldown_${email}`, Date.now().toString());
      
      // Redirect to verify email page (no query params needed, using localStorage)
      router.push('/(auth)/verify-email');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
      setLoading(false);
    }
  };

  // Filter universities based on search
  const filteredUniversities = universities.filter((uni) =>
    uni.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo className="text-2xl" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Select your university and enter your email to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendOtp();
            }}
            className="space-y-5"
          >
            {/* University Selection */}
            <div>
              <label htmlFor="university-search" className="block text-sm font-medium text-slate-700 mb-2">
                University
              </label>
              
              {/* Search input for universities */}
              <div className="relative mb-2">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-5 w-5 text-slate-400"
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
                </div>
                <Input
                  id="university-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search universities..."
                  className="pl-10"
                />
              </div>

              {/* University List */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {filteredUniversities.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {searchQuery ? 'No universities found' : 'Loading universities...'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredUniversities.map((uni) => (
                      <button
                        key={uni.id}
                        type="button"
                        onClick={() => {
                          setSelectedUniversity(uni);
                          setError(null);
                          // Auto-fill email domain hint if email is empty
                          if (!email && uni.emailDomains.length > 0) {
                            setEmail(`@${uni.emailDomains[0]}`);
                          }
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                          selectedUniversity?.id === uni.id
                            ? 'bg-emerald-50 border-l-4 border-emerald-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{uni.name}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {uni.emailDomains.join(', ')}
                            </div>
                          </div>
                          {selectedUniversity?.id === uni.id && (
                            <svg
                              className="h-5 w-5 text-emerald-600"
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
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedUniversity && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Selected: {selectedUniversity.name}</span>
                </div>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                University Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@university.it"
                  required
                  disabled={loading}
                  className="pl-12"
                />
              </div>
              {selectedUniversity && (
                <p className="mt-2 text-xs text-slate-500">
                  Must be from: {selectedUniversity.emailDomains.join(', ')}
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading || !selectedUniversity || !email} className="w-full">
              {loading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Sending code...
                </>
              ) : (
                'Send verification code'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <BrandLogo className="text-2xl" />
              </div>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
