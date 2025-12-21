'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { submitUniversityRequest } from '@/app/actions/university-request';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

type UniversityRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledEmail?: string;
  onSuccess?: () => void;
};

export function UniversityRequestDialog({
  open,
  onOpenChange,
  prefilledEmail = '',
  onSuccess,
}: UniversityRequestDialogProps) {
  const [formData, setFormData] = useState({
    requestedName: '',
    requestedCity: '',
    suggestedDomains: '',
    requesterEmail: prefilledEmail,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({ ...prev, requesterEmail: prefilledEmail }));
      setErrors({});
      setSuccess(false);
    }
  }, [open, prefilledEmail]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formDataObj = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.append(key, value);
    });

    const result = await submitUniversityRequest(formDataObj);

    if (result.error) {
      if (result.details) {
        setErrors(result.details as Record<string, string>);
      } else {
        setErrors({ submit: result.error });
      }
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
        setTimeout(() => {
          setFormData({
            requestedName: '',
            requestedCity: '',
            suggestedDomains: '',
            requesterEmail: prefilledEmail,
            notes: '',
          });
          setSuccess(false);
        }, 300);
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {success ? (
          <div className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <DialogTitle>Request submitted</DialogTitle>
            <DialogDescription className="mt-2">
              We&apos;ll review your request and add your university soon.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request your university</DialogTitle>
              <DialogDescription>
                If your university email domain is not yet supported, submit it here.
                We&apos;ll add it quickly.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="requested-name" className="block text-sm font-medium text-slate-700 mb-2">
                  University name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="requested-name"
                  value={formData.requestedName}
                  onChange={(e) => handleChange('requestedName', e.target.value)}
                  placeholder="e.g., University of Bologna"
                  disabled={loading}
                  className={cn(errors.requestedName && 'border-rose-300')}
                />
                {errors.requestedName && (
                  <p className="mt-1 text-sm text-rose-600">{errors.requestedName}</p>
                )}
              </div>

              <div>
                <label htmlFor="requested-city" className="block text-sm font-medium text-slate-700 mb-2">
                  City
                </label>
                <Input
                  id="requested-city"
                  value={formData.requestedCity}
                  onChange={(e) => handleChange('requestedCity', e.target.value)}
                  placeholder="e.g., Bologna"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="suggested-domains" className="block text-sm font-medium text-slate-700 mb-2">
                  Suggested email domains
                </label>
                <Input
                  id="suggested-domains"
                  value={formData.suggestedDomains}
                  onChange={(e) => handleChange('suggestedDomains', e.target.value)}
                  placeholder="studenti.unibo.it, unibo.it"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Example: studenti.unibo.it, unibo.it (comma or space separated)
                </p>
              </div>

              <div>
                <label htmlFor="requester-email" className="block text-sm font-medium text-slate-700 mb-2">
                  Your university email <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="requester-email"
                  type="email"
                  value={formData.requesterEmail}
                  onChange={(e) => handleChange('requesterEmail', e.target.value)}
                  placeholder="your.email@university.it"
                  disabled={loading}
                  className={cn(errors.requesterEmail && 'border-rose-300')}
                />
                {errors.requesterEmail && (
                  <p className="mt-1 text-sm text-rose-600">{errors.requesterEmail}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                  Note (optional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="flex w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#014D40] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014D40]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Any additional information..."
                  disabled={loading}
                />
              </div>

              {errors.submit && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader size="sm" className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send request'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}



