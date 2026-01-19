import Head from 'next/head';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export default function ForBusinessPage() {
  return (
    <>
      <Head>
        <title>DormUp for Business | DormUp Discounts</title>
        <meta
          name="description"
          content="Join DormUp and attract students to your venue."
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 pb-24 pt-24">
        <div className="mx-auto w-full max-w-3xl px-6">
          <div className="space-y-8 rounded-3xl bg-white p-8 shadow-lg sm:p-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
                <BrandLogo /> for Business
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                A platform that brings you students — you only pay for real customers.
              </p>
            </div>

            <div className="space-y-6 rounded-2xl bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Why <BrandLogo />?
              </h2>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-emerald-600">✓</span>
                  <span>
                    <strong>Direct contact with students</strong> — your venue appears
                    in the discount catalog for thousands of students in Rimini and
                    Bologna.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-emerald-600">✓</span>
                  <span>
                    <strong>Pay for results</strong> — you only pay when a student
                    actually uses a discount at your venue.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-emerald-600">✓</span>
                  <span>
                    <strong>Simple integration</strong> — QR codes and unique codes
                    for quick discount confirmation at the counter.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-emerald-600">✓</span>
                  <span>
                    <strong>Analytics</strong> — track discount usage and the
                    effectiveness of your advertising.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Already a <BrandLogo /> partner?
              </h2>
              <Link
                href="/partner/login"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                Partner login
              </Link>
            </div>

            <div className="pt-4 text-center text-sm text-slate-500">
              <p>
                Want to become a partner?{' '}
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=partners@dormup-it.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Contact us
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

