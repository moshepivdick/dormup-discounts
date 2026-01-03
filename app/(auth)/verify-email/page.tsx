'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandLogo } from '@/components/BrandLogo';
import { Loader } from '@/components/ui/loader';
import { OtpInput } from '@/components/auth/OtpInput';

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const email = searchParams.get('email') || '';
  const universityId = searchParams.get('universityId') || '';
  
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
    if (email) {
      const stored = localStorage.getItem(`otp_cooldown_${email}`);
      if (stored) {
        const elapsed = Math.floor((Date.now() - parseInt(stored)) / 1000);
        if (elapsed < RESEND_COOLDOWN_SECONDS) {
          setResendCooldown(RESEND_COOLDOWN_SECONDS - elapsed);
        }
      }
    }
  }, [email]);

  // Redirect if email is missing
  useEffect(() => {
    if (!email) {
      router.push('/(auth)/signup');
    }
  }, [email, router]);

  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    if (!email) {
      setError('Email is missing');
      return;
    }

    if (!universityId) {
      setError('University selection is missing');
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
        // Email is automatically confirmed by Supabase after OTP verification
        // user.email_confirmed_at and user.confirmed_at are set automatically
        
        // Upsert profile with university info
        const response = await fetch('/api/profile/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            universityId: universityId,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          setError(result.error || 'Failed to create profile');
          setLoading(false);
          return;
        }

        // Clear OTP cooldown
        localStorage.removeItem(`otp_cooldown_${email}`);
        
        // Account is now activated and verified in Supabase
        // Redirect to app
        window.location.href = '/app';
      } else {
        setError('Verification failed. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

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
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo className="text-2xl" />
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
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
          </div>
          <CardTitle className="text-2xl">Enter verification code</CardTitle>
          <CardDescription>
            We&apos;ve sent a 6-digit code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                'Verify and activate account'
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
                  router.push('/(auth)/signup');
                }}
                className="w-full text-sm text-slate-600 hover:text-[#014D40] transition font-medium"
              >
                Change email address
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <BrandLogo className="text-2xl" />
              </div>
              <CardTitle className="text-2xl">Enter verification code</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

