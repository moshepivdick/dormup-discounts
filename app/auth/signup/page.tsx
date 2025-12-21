'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/app/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandLogo } from '@/components/BrandLogo';
import { Loader } from '@/components/ui/loader';
import { UniversitySelect } from '@/components/UniversitySelect';
import { UniversityRequestDialog } from '@/components/UniversityRequestDialog';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    universityId: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    // Validate form before submission
    if (!formData.universityId || formData.universityId.trim() === '') {
      setError('Please select a university');
      return;
    }
    
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);

    const formDataObj = new FormData();
    formDataObj.append('email', formData.email.trim());
    formDataObj.append('password', formData.password);
    formDataObj.append('universityId', formData.universityId.trim());

    try {
      const result = await signup(formDataObj);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.success) {
        router.push('/auth/check-email');
      } else {
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to create account. Please try again.');
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
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join DormUp to access exclusive student discounts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@university.it"
                  required
                  disabled={loading}
                  className="pl-12"
                />
              </div>
            </div>

            <div>
              <label htmlFor="university" className="block text-sm font-medium text-slate-700 mb-2">
                University <span className="text-rose-500">*</span>
              </label>
              <UniversitySelect
                value={formData.universityId}
                onValueChange={(value) => {
                  setFormData({ ...formData, universityId: value });
                  setError(null); // Clear error when university is selected
                }}
                disabled={loading}
              />
              {!formData.universityId && (
                <p className="mt-1 text-xs text-rose-500">
                  Please select your university
                </p>
              )}
              <div className="mt-2 text-xs text-slate-500">
                Don&apos;t see your university?{' '}
                <button
                  type="button"
                  onClick={() => setRequestDialogOpen(true)}
                  className="font-medium text-[#014D40] hover:underline"
                >
                  Request it
                </button>
                <UniversityRequestDialog
                  open={requestDialogOpen}
                  onOpenChange={setRequestDialogOpen}
                  prefilledEmail={formData.email}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 8 characters"
                required
                minLength={8}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-slate-500">
                Must be at least 8 characters long
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {error.includes('email') && (
                    <div className="mt-2 text-xs">
                      <p className="font-semibold">Возможные решения:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>Проверьте правильность email адреса</li>
                        <li>Проверьте папку спам</li>
                        <li>Настройте SMTP в Supabase Dashboard</li>
                        <li>Или временно отключите подтверждение email для разработки</li>
                      </ul>
                      <p className="mt-2 text-xs text-slate-600">
                        См. инструкцию в файле FIX_EMAIL_ERROR.md
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading || !formData.universityId} className="w-full">
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
    </div>
  );
}
