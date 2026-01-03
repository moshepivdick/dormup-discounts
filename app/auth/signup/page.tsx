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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.university-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

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
      
      // Immediately redirect to verify email page
      window.location.href = '/auth/verify-email';
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
            {/* University Selection Dropdown */}
            <div className="university-dropdown">
              <label htmlFor="university" className="block text-sm font-semibold text-slate-800 mb-3">
                University
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setSearchQuery('');
                  }}
                  className={`w-full h-11 px-4 text-left rounded-xl border-2 transition-all flex items-center justify-between ${
                    selectedUniversity
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${isDropdownOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}`}
                >
                  <span className={selectedUniversity ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                    {selectedUniversity ? selectedUniversity.name : 'Select a university...'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-200">
                      <div className="relative">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                          <svg
                            className="h-4 w-4 text-slate-400"
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
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="pl-9 h-9 text-sm border-slate-200 focus:border-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* University List */}
                    <div className="overflow-y-auto max-h-48">
                      {filteredUniversities.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                          {searchQuery ? 'No universities found' : 'Loading universities...'}
                        </div>
                      ) : (
                        filteredUniversities.map((uni) => {
                          const isSelected = selectedUniversity?.id === uni.id;
                          return (
                            <button
                              key={uni.id}
                              type="button"
                              onClick={() => {
                                setSelectedUniversity(uni);
                                setIsDropdownOpen(false);
                                setSearchQuery('');
                                setError(null);
                              }}
                              className={`w-full px-4 py-3 text-left transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 font-medium'
                                  : 'hover:bg-slate-50 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <svg
                                    className="w-4 h-4"
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
                                <span className="flex-1">{uni.name}</span>
                                {isSelected && (
                                  <svg
                                    className="w-5 h-5 text-emerald-600"
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
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
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
