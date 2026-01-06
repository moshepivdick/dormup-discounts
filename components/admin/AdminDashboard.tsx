'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Stats = {
  totalDiscounts: number;
  confirmedDiscounts: number;
  conversionRate: number;
};

export function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load admin stats
    fetch('/api/admin/stats/overview')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .catch((err) => {
        console.error('Error loading stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      // Clear admin_gate cookie
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still redirect even if API call fails
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="mt-1 text-slate-400">Control panel for DormUp Discounts</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Exit Admin
          </Button>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="bg-white/10 border-white/20 p-6">
              <p className="text-sm text-slate-400 mb-2">Total Discounts</p>
              <p className="text-3xl font-bold text-white">{stats.totalDiscounts}</p>
            </Card>
            <Card className="bg-white/10 border-white/20 p-6">
              <p className="text-sm text-slate-400 mb-2">Confirmed</p>
              <p className="text-3xl font-bold text-white">{stats.confirmedDiscounts}</p>
            </Card>
            <Card className="bg-white/10 border-white/20 p-6">
              <p className="text-sm text-slate-400 mb-2">Conversion Rate</p>
              <p className="text-3xl font-bold text-white">{stats.conversionRate}%</p>
            </Card>
          </div>
        ) : (
          <div className="text-white">Failed to load stats</div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="bg-white/10 border-white/20 p-6 hover:bg-white/15 transition">
            <h2 className="text-xl font-semibold text-white mb-2">Venues</h2>
            <p className="text-slate-400 mb-4">Manage partner venues</p>
            <Button
              onClick={() => router.push('/admin/venues')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              View Venues
            </Button>
          </Card>
          <Card className="bg-white/10 border-white/20 p-6 hover:bg-white/15 transition">
            <h2 className="text-xl font-semibold text-white mb-2">Partners</h2>
            <p className="text-slate-400 mb-4">Manage partner accounts</p>
            <Button
              onClick={() => router.push('/admin/partners')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              View Partners
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

