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
import Link from 'next/link';

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  // Load email and universityId from localStorage (primary) or searchParams (fallback)
  const [email, setEmail] = useState<string>('');
  const [universityId, setUniversityId] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load email and universityId from localStorage first, then searchParams
  useEffect(() => {
    // Try localStorage first (primary source)
    const storedEmail = localStorage.getItem('dormup_auth_email');
    const storedUniversityId = localStorage.getItem('dormup_auth_universityId');
    
    if (storedEmail && storedUniversityId) {
      setEmail(storedEmail);
      setUniversityId(storedUniversityId);
      setIsLoadingData(false);
      return;
    }
    
    // Fallback to searchParams
    const paramEmail = searchParams?.get('email') || '';
    const paramUniversityId = searchParams?.get('universityId') || '';
    
    if (paramEmail && paramUniversityId) {
      setEmail(paramEmail);
      setUniversityId(paramUniversityId);
      // Also store in localStorage for consistency
      localStorage.setItem('dormup_auth_email', paramEmail);
      localStorage.setItem('dormup_auth_universityId', paramUniversityId);
      setIsLoadingData(false);
      return;
    }
    
    // If still missing, show error state
    setIsLoadingData(false);
  }, [searchParams]);

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

  const verifyOtp = async () => {
    // Strict OTP input handling
    const cleanCode = otpCode.replace(/\D/g, ''); // Remove non-digits
    if (cleanCode.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }

    if (!email) {
      setError('Email is missing. Please go back and try again.');
      return;
    }

    if (!universityId) {
      setError('University selection is missing. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify OTP with correct parameters
      const { data, error: authError } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: cleanCode, // Use cleaned code (6 digits only)
        type: 'email',
      });

      if (authError) {
        // Show real Supabase error message
        console.error('OTP verification error:', authError);
        setError(authError.message || 'Invalid or expired code. Please try again.');
        setLoading(false);
        return;
      }

      // Check if we have user and session from verifyOtp response
      if (!data.user) {
        console.error('No user in verifyOtp response');
        setError('User not found. Please try again.');
        setLoading(false);
        return;
      }

      if (!data.session) {
        console.error('No session in verifyOtp response');
        setError('Failed to create session. Please try again.');
        setLoading(false);
        return;
      }

      // Wait a bit for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 100);

      // Extract first name from email (local part before first dot)
      const localPart = email.split('@')[0];
      const firstPart = localPart.split('.')[0];
      const firstName = firstPart
        ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
        : null;

      // Wait a bit more to ensure session cookies are set
      await new Promise(resolve => setTimeout(resolve, 200));

      // Upsert profile with university info
      const response = await fetch('/api/profile/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          universityId: universityId,
        }),
        credentials: 'include', // Ensure cookies are sent
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Profile upsert error:', {
          status: response.status,
          statusText: response.statusText,
          error: result,
          userId: data.user.id,
          email: data.user.email,
        });
        setError(result.error || `Failed to create profile: ${result.error || 'Unknown error'}. Please try again.`);
        setLoading(false);
        return;
      }

      // Clear auth data from localStorage
      localStorage.removeItem('dormup_auth_email');
      localStorage.removeItem('dormup_auth_universityId');
      localStorage.removeItem(`otp_cooldown_${email}`);
      
      // Account is now activated and verified in Supabase
      // Redirect to app
      window.location.href = '/app';
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify code. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

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
        console.error('Resend OTP error:', authError);
        setError(authError.message || 'Failed to send code');
        setLoading(false);
        return;
      }

      // Store cooldown timestamp
      localStorage.setItem(`otp_cooldown_${email}`, Date.now().toString());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setLoading(false);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to send code');
      setLoading(false);
    }
  };

  // Show loading state while loading data
  if (isLoadingData) {
    return (
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
    );
  }

  // Show error if email or universityId is missing
  if (!email || !universityId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <BrandLogo className="text-2xl" />
            </div>
            <CardTitle className="text-2xl">Missing Information</CardTitle>
            <CardDescription>
              We couldn&apos;t find your registration information. Please start over.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signup">
              <Button className="w-full">Go back to registration</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
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

            <Button type="submit" disabled={loading || otpCode.replace(/\D/g, '').length !== 6} className="w-full">
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

              <Link
                href="/auth/signup"
                className="block w-full text-center text-sm text-slate-600 hover:text-[#014D40] transition font-medium"
              >
                Change email address
              </Link>
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
