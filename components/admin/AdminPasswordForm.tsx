'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { verifyAdminPassword } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminPasswordForm() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyAdminPassword(password);
      
      if (result.success) {
        // Reload page to show dashboard
        router.refresh();
      } else {
        setError(result.error || 'Invalid password');
        setPassword('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Admin password verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
          Admin Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          required
          disabled={loading}
          className="w-full"
        />
      </div>
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {loading ? 'Verifying...' : 'Continue'}
      </Button>
    </form>
  );
}

