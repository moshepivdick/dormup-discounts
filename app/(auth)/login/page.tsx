'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { isUniversityEmail } from '@/lib/universityDomains';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandLogo } from '@/components/BrandLogo';
import { Loader } from '@/components/ui/loader';
import { OtpInput } from '@/components/auth/OtpInput';

type Step = 'EMAIL' | 'CODE';

const RESEND_COOLDOWN_SECONDS = 30;

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Restore cooldown from localStorage
  useEffect(() => {
    if (step === 'CODE' && email) {
      const stored = localStorage.getItem(`otp_cooldown_${email}`);
      if (stored) {
        const elapsed = Math.floor((Date.now() - parseInt(stored)) / 1000);
        if (elapsed < RESEND_COOLDOWN_SECONDS) {
          setResendCooldown(RESEND_COOLDOWN_SECONDS - elapsed);
        }
      }
    }
  }, [step, email]);

  const sendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate university email
    if (!isUniversityEmail(email)) {
      setError('Use your university email');
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
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('CODE');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: otpCode,
        type: 'email',
      });

      if (authError) {
        setError(authError.message || 'Invalid or expired code');
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        // Create/update profile
        await createProfile(data.user.id, email);
        
        // Update last activity
        updateLastActivity();
        
        // Redirect to account page
        router.push('/account');
      } else {
        setError('Verification failed. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
      setLoading(false);
    }
  };

  const createProfile = async (userId: string, userEmail: string) => {
    try {
      const { extractFirstName } = await import('@/lib/universityDomains');
      const fullName = extractFirstName(userEmail);

      // Upsert profile using Supabase client (RLS will allow if user is authenticated)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: userEmail.toLowerCase(),
          full_name: fullName || null,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Non-blocking - user is still authenticated
      }
    } catch (err) {
      console.error('Profile creation error:', err);
      // Non-blocking
    }
  };

  const updateLastActivity = () => {
    localStorage.setItem('lastActivityAt', Date.now().toString());
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await sendOtp();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo className="text-2xl" />
          </div>
          <CardTitle className="text-2xl">
            {step === 'EMAIL' ? 'Sign in to your account' : 'Enter verification code'}
          </CardTitle>
          <CardDescription>
            {step === 'EMAIL'
              ? 'Welcome back to DormUp'
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'EMAIL' ? (
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
              <Link href="/signup" className="block">
                <Button type="button" variant="outline" className="w-full">
                  Create an account
                </Button>
              </Link>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyOtp();
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4 text-center">
                  Enter the 6-digit code
                </label>
                <OtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading || otpCode.length !== 6} className="w-full">
                {loading ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              <div className="space-y-2">
                <Button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  variant="ghost"
                  className="w-full"
                >
                  {resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : 'Resend code'}
                </Button>

                <button
                  onClick={() => {
                    setStep('EMAIL');
                    setOtpCode('');
                    setError(null);
                  }}
                  className="w-full text-sm text-slate-600 hover:text-[#014D40] transition font-medium"
                >
                  Change email address
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <BrandLogo className="text-2xl" />
              </div>
              <CardTitle className="text-2xl">Sign in to your account</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

