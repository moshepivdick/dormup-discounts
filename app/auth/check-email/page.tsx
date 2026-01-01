'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CheckEmailPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to resend email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to resend verification email' });
    } finally {
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
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Click it to verify your account and start using DormUp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium mb-2">Didn&apos;t receive the email?</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 mb-3">
              <li>Check your spam folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and try again</li>
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Sending...
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>
          </div>
          
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
