// DISABLED: This page is no longer used since discount codes are client-side only
// QR codes now point directly to the code value, not to a slug-based URL

import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import QRCode from 'react-qr-code';
import { BrandLogo } from '@/components/BrandLogo';

type DiscountPageProps = {
  code: string;
};

export default function DiscountLanding({ code }: DiscountPageProps) {
  return (
    <>
      <Head>
        <title>Code {code} | DormUp Discounts</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">
          <BrandLogo /> Discount
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[0.4em]">{code}</h1>
        <div className="mt-8 rounded-3xl bg-white p-6">
          <QRCode value={code} size={220} />
        </div>
        <p className="mt-4 text-sm text-emerald-100">
          Show this screen at the counter.
        </p>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<DiscountPageProps> = async ({
  params,
}) => {
  // Since codes are now client-side, this page accepts the code directly from the slug
  const slug = params?.slug as string;
  if (!slug) {
    return { notFound: true };
  }

  // Use the slug as the code (uppercase for display)
  return {
    props: {
      code: slug.toUpperCase(),
    },
  };
};

