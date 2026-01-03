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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-12">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <BrandLogo className="text-2xl" />
          </div>
          <CardTitle className="text-3xl font-bold">Create your account</CardTitle>
          <CardDescription className="text-base">
            Select your university and enter your email to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendOtp();
            }}
            className="space-y-6"
          >
            {/* University Selection */}
            <div>
              <label htmlFor="university-search" className="block text-sm font-semibold text-slate-800 mb-3">
                University
              </label>
              
              {/* Search input for universities */}
              <div className="relative mb-3">
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
                  className="pl-11 h-11 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* University List */}
              <div className="max-h-72 overflow-y-auto rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                {filteredUniversities.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-slate-300 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">
                      {searchQuery ? 'No universities found' : 'Loading universities...'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredUniversities.map((uni) => {
                      const isSelected = selectedUniversity?.id === uni.id;
                      return (
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
                          className={`w-full px-5 py-4 text-left transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-l-4 border-emerald-500 shadow-sm'
                              : 'hover:bg-slate-50 active:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* University Icon */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                isSelected
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              } transition-colors`}>
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                  />
                                </svg>
                              </div>
                              
                              {/* University Info */}
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-base mb-1 ${
                                  isSelected ? 'text-emerald-900' : 'text-slate-900'
                                }`}>
                                  {uni.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <svg
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span className="truncate">{uni.emailDomains.join(', ')}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Check Icon */}
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {selectedUniversity && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <svg className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-emerald-700">
                    Selected: <span className="font-semibold">{selectedUniversity.name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-3">
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
                  className="pl-12 h-11 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              {selectedUniversity && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Must be from: <span className="font-medium">{selectedUniversity.emailDomains.join(', ')}</span></span>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl border-2">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={loading || !selectedUniversity || !email} 
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
          <Card className="w-full max-w-lg">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <BrandLogo className="text-2xl" />
              </div>
              <CardTitle className="text-3xl font-bold">Create your account</CardTitle>
              <CardDescription className="text-base">Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
