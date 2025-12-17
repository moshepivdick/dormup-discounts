'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/app/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UniversitySelect } from '@/components/UniversitySelect';
import { UniversityRequestDialog } from '@/components/UniversityRequestDialog';
import { BrandLogo } from '@/components/BrandLogo';
import { Loader } from '@/components/ui/loader';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    universityId: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formDataObj = new FormData();
    formDataObj.append('email', formData.email);
    formDataObj.append('password', formData.password);
    formDataObj.append('universityId', formData.universityId);

    const result = await signup(formDataObj);

    if (result.error) {
      if (result.code === 'DOMAIN_NOT_SUPPORTED') {
        setError(result.error);
      } else {
        setError(result.error);
      }
    } else {
      router.push('/auth/check-email');
    }
    setLoading(false);
  };

  const handleRequestSuccess = () => {
    setRequestSubmitted(true);
    setShowRequestDialog(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo className="text-2xl" />
          </div>
          <CardTitle className="text-2xl">Create your student account</CardTitle>
          <CardDescription>For students of Italian universities</CardDescription>
        </CardHeader>
        <CardContent>
          {requestSubmitted && (
            <Alert className="mb-4">
              <AlertDescription>
                Request submitted. You can sign up once your university domain is approved.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@university.it"
                  required
                  disabled={loading || requestSubmitted}
                  className="pl-12"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  disabled={loading || requestSubmitted}
                />
              </div>
            </div>

            <UniversitySelect
              value={formData.universityId}
              onChange={(id) => setFormData({ ...formData, universityId: id || '' })}
              disabled={loading || requestSubmitted}
            />

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRequestDialog(true)}
                className="text-sm text-[#014D40] hover:underline"
                disabled={loading || requestSubmitted}
              >
                My university is not listed
              </button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {error.includes("isn't supported") && (
                    <Button
                      type="button"
                      variant="link"
                      className="ml-2 h-auto p-0 text-rose-600 underline"
                      onClick={() => setShowRequestDialog(true)}
                    >
                      Request my university
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || requestSubmitted}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>

            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-[#014D40] hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <UniversityRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        prefilledEmail={formData.email}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}

