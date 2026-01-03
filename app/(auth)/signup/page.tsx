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

type Step = 'UNIVERSITY' | 'EMAIL';

interface University {
  id: string;
  name: string;
  emailDomains: string[];
}

function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>('UNIVERSITY');
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Store cooldown timestamp
      localStorage.setItem(`otp_cooldown_${email}`, Date.now().toString());
      
      // Redirect to verify email page
      router.push(`/(auth)/verify-email?email=${encodeURIComponent(email)}&universityId=${encodeURIComponent(selectedUniversity.id)}`);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo className="text-2xl" />
          </div>
          <CardTitle className="text-2xl">
            {step === 'UNIVERSITY' && 'Choose your university'}
            {step === 'EMAIL' && 'Enter your email'}
          </CardTitle>
          <CardDescription>
            {step === 'UNIVERSITY' && 'Select your university to continue'}
            {step === 'EMAIL' && `We'll send a code to verify your ${selectedUniversity?.name} email`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'UNIVERSITY' ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="university" className="block text-sm font-medium text-slate-700 mb-2">
                  University
                </label>
                <select
                  id="university"
                  value={selectedUniversity?.id || ''}
                  onChange={(e) => {
                    const uni = universities.find((u) => u.id === e.target.value);
                    setSelectedUniversity(uni || null);
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 transition-all focus:border-[#014D40] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014D40]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a university...</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => {
                  if (selectedUniversity) {
                    setStep('EMAIL');
                    setError(null);
                  }
                }}
                disabled={!selectedUniversity || loading}
                className="w-full"
              >
                Next
              </Button>
            </div>
          ) : step === 'EMAIL' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
              className="space-y-5"
            >
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

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Sending code...
                  </>
                ) : (
                  'Send code'
                )}
              </Button>

              <button
                onClick={() => {
                  setStep('UNIVERSITY');
                  setError(null);
                }}
                className="w-full text-sm text-slate-600 hover:text-[#014D40] transition font-medium"
              >
                Change university
              </button>
            </form>
          ) : null}
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
              <CardTitle className="text-2xl">Choose your university</CardTitle>
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

