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

const RESEND_COOLDOWN_SECONDS = 60; // Increased to 60 seconds for better UX

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

    console.log('=== OTP VERIFICATION START ===');
    console.log('Email:', cleanEmail);
    console.log('Code length:', cleanCode.length);
    console.log('Code (masked):', cleanCode.substring(0, 2) + '****');
    console.log('Verification type: email');

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'email', // Use 'email' for OTP verification (not 'signup' or 'magiclink')
    });

    console.log('=== OTP VERIFICATION RESPONSE ===');
    console.log('Has data:', !!data);
    console.log('Has error:', !!error);
    
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
      
      throw error; // Throw the error object directly for better handling
    }

    console.log('User ID:', data?.user?.id);
    console.log('User email:', data?.user?.email);
    console.log('Email confirmed at:', data?.user?.email_confirmed_at);
    console.log('Has session:', !!data?.session);
    console.log('Session access token (first 20 chars):', data?.session?.access_token?.substring(0, 20));
    console.log('================================');

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
      console.log('=== STARTING OTP VERIFICATION FLOW ===');
      
      // Step 1: Verify OTP code
      const data = await verifyOtpCode(email, cleanCode);
      
      // Step 2: Verify we have user and session
      if (!data.user) {
        throw new Error('User not found in verification response');
      }

      if (!data.session) {
        console.warn('No session in verifyOtp response, attempting to get session...');
        // If session is missing, try to get it explicitly
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('Failed to get session:', sessionError);
          throw new Error('Session not created. Please try again.');
        }
        
        console.log('Session retrieved successfully via getSession()');
      }

      // Step 3: Verify session is persisted by checking getUser
      console.log('=== VERIFYING SESSION PERSISTENCE ===');
      const { data: userData, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) {
        console.error('getUser error:', getUserError);
        throw new Error(`Session verification failed: ${getUserError.message}`);
      }

      if (!userData.user) {
        throw new Error('Session verification failed: No user found');
      }

      console.log('=== SESSION VERIFICATION SUCCESS ===');
      console.log('User ID:', userData.user.id);
      console.log('Email:', userData.user.email);
      console.log('Email confirmed at:', userData.user.email_confirmed_at);
      console.log('Email confirmed:', !!userData.user.email_confirmed_at);
      console.log('=====================================');

      // Step 4: Create/update profile with university information
      console.log('=== CREATING/UPDATING PROFILE ===');
      const cleanEmail = email.trim().toLowerCase();
      
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userData.user.id,
            email: cleanEmail,
            university_id: universityId,
            verified_student: true,
          }, {
            onConflict: 'id',
          });

        if (profileError) {
          console.error('Profile upsert error (direct):', profileError);
          
          // Fallback: Try via API route
          console.log('Attempting profile upsert via API route...');
          const response = await fetch('/api/profile/upsert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              universityId: universityId,
            }),
            credentials: 'include',
          });

          if (!response.ok) {
            const result = await response.json();
            console.error('Profile upsert error (API):', result);
            // Don't throw - profile can be updated later, user is verified
            console.warn('Profile upsert failed, but user is verified. Continuing...');
          } else {
            console.log('Profile upsert successful via API route');
          }
        } else {
          console.log('Profile upsert successful (direct)');
        }
      } catch (profileErr: any) {
        console.error('Profile upsert exception:', profileErr);
        // Don't block the flow - user is verified, profile can be fixed later
        console.warn('Profile upsert failed, but user is verified. Continuing...');
      }

      // Step 5: Clear auth data from localStorage
      localStorage.removeItem('dormup_auth_email');
      localStorage.removeItem('dormup_auth_universityId');
      localStorage.removeItem(`otp_cooldown_${cleanEmail}`);
      
      console.log('=== VERIFICATION COMPLETE - REDIRECTING ===');
      
      // Step 6: Redirect to account page
      // Use router.push for client-side navigation (preserves session)
      router.push('/account');
    } catch (err: any) {
      // STRICT ERROR VISIBILITY - NO GENERIC ERRORS
      console.error('=== VERIFICATION EXCEPTION ===');
      console.error('Error:', err);
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      console.error('Error code:', err.code);
      console.error('Error stack:', err.stack);
      console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      console.error('==============================');
      
      // Parse error message for better UX
      let errorMessage = 'Failed to verify code. Please try again.';
      
      if (err.message) {
        // Handle specific Supabase error codes
        if (err.code === 'invalid_token' || err.message.includes('invalid') || err.message.includes('Invalid')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (err.code === 'expired_token' || err.message.includes('expired') || err.message.includes('Expired')) {
          errorMessage = 'This verification code has expired. Please request a new one.';
        } else if (err.message.includes('rate limit') || err.message.includes('too many')) {
          errorMessage = 'Too many attempts. Please wait a moment and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) {
      if (resendCooldown > 0) {
        setError(`Please wait ${resendCooldown} seconds before requesting a new code.`);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('=== RESENDING OTP CODE ===');
      const cleanEmail = email.trim().toLowerCase();
      console.log('Email:', cleanEmail);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('Resend OTP error:', error);
        let errorMessage = 'Failed to send code. Please try again.';
        
        // Better error messages
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          errorMessage = 'Too many requests. Please wait a moment before requesting a new code.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Invalid email address. Please check and try again.';
        } else {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      console.log('OTP resend successful');
      
      // Store cooldown timestamp
      localStorage.setItem(`otp_cooldown_${cleanEmail}`, Date.now().toString());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      
      // Show success message
      setError(null);
      // You could add a success state here if needed
      
      setLoading(false);
    } catch (err: any) {
      console.error('Resend exception:', err);
      setError(err.message || 'Failed to send code. Please try again.');
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
