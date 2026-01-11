import { useState } from 'react';
import { useRouter } from 'next/router';

export function CreateReportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateReport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Get current month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const response = await fetch('/api/reports/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: monthStr,
          scope: 'admin',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Отчет создается. Перейдите на вкладку Reports для просмотра статуса.' });
        // Optionally redirect to reports page after a short delay
        setTimeout(() => {
          router.push('/admin/reports?tab=snapshots');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Ошибка при создании отчета' });
      }
    } catch (error) {
      console.error('Error creating report:', error);
      setMessage({ type: 'error', text: 'Произошла ошибка при создании отчета' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Создать отчет</h3>
          <p className="mt-1 text-sm text-white/70">
            Сгенерировать PDF и PNG отчет за текущий месяц
          </p>
        </div>
        <button
          onClick={handleCreateReport}
          disabled={loading}
          className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:bg-emerald-800 disabled:cursor-not-allowed"
        >
          {loading ? 'Создание...' : 'Создать отчет'}
        </button>
      </div>
      {message && (
        <div
          className={`mt-4 rounded-xl px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-200'
              : 'bg-rose-500/20 text-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
