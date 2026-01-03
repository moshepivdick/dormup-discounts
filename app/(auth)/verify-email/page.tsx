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

  // VERIFY OTP CODE - ONLY valid confirmation step
  const verifyOtpCode = async (email: string, code: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'email',
    });

    if (error) {
      // FULL ERROR EXPOSURE - log everything
      console.error('=== OTP VERIFICATION ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error name:', error.name);
      console.error('Error code:', (error as any).code);
      console.error('Error details:', (error as any).details);
      console.error('Error hint:', (error as any).hint);
      console.error('================================');
      
      // Throw with full error details
      const errorDetails = {
        message: error.message,
        status: error.status,
        name: error.name,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      };
      
      throw new Error(JSON.stringify(errorDetails, null, 2));
    }

    return data;
  };

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
      // ISOLATION MODE - Only verify OTP, no side effects
      console.log('=== ISOLATION MODE: Starting OTP verification ===');
      const data = await verifyOtpCode(email, cleanCode);
      console.log('OTP verification succeeded, data:', data);

      // Verify we have user and session
      if (!data.user) {
        throw new Error('User not found in verification response');
      }

      if (!data.session) {
        throw new Error('Session not created in verification response');
      }

      // ISOLATION MODE - Only call getUser to check email_confirmed_at
      console.log('=== ISOLATION MODE: Calling getUser ===');
      const { data: userData, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) {
        console.error('getUser error:', getUserError);
        throw new Error(`getUser failed: ${getUserError.message}`);
      }

      if (!userData.user) {
        throw new Error('getUser returned no user');
      }

      // Log email_confirmed_at
      console.log('=== ISOLATION MODE: User verification status ===');
      console.log('User ID:', userData.user.id);
      console.log('Email:', userData.user.email);
      console.log('email_confirmed_at:', userData.user.email_confirmed_at);
      console.log('Email confirmed:', !!userData.user.email_confirmed_at);
      console.log('Session exists:', !!data.session);
      console.log('===============================================');

      // ISOLATION MODE - DO NOT do profile upsert or redirect
      // This is to isolate whether the 500 error is from database triggers
      // or from our post-verification code
      
      setError(null);
      alert(`ISOLATION MODE: OTP verified successfully!\n\nUser ID: ${userData.user.id}\nEmail: ${userData.user.email}\nemail_confirmed_at: ${userData.user.email_confirmed_at || 'NULL'}\n\nCheck console for full details.`);
      setLoading(false);
      
      // DO NOT redirect or upsert profile in isolation mode
      return;
    } catch (err: any) {
      // STRICT ERROR VISIBILITY - NO GENERIC ERRORS
      console.error('=== VERIFICATION EXCEPTION ===');
      console.error('Error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      console.error('==============================');
      
      const errorMessage = err.message || 'Failed to verify code. Please try again.';
      setError(errorMessage);
      
      // ALWAYS show error in alert for debugging (temporary)
      if (typeof window !== 'undefined') {
        alert(`OTP Verification Error:\n\n${errorMessage}\n\nCheck console for full details.`);
      }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    setLoading(true);
    setError(null);

    try {
      // SEND OTP CODE - Supabase-generated token ONLY
      const cleanEmail = email.trim().toLowerCase();
      
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('sendOtp error (resend):', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      // Store cooldown timestamp
      localStorage.setItem(`otp_cooldown_${cleanEmail}`, Date.now().toString());
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
            <Link href="/(auth)/signup">
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
                href="/(auth)/signup"
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
