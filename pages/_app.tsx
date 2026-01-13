import type { ReactElement, ReactNode } from 'react';
import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import '@/styles/globals.css';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { CookieBanner } from '@/components/CookieBanner';
import { Footer } from '@/components/Footer';
import { AnalyticsInitializer } from '@/components/AnalyticsInitializer';
import Head from "next/head";

<Head>
  <title>DormUp Discounts</title>

  {/* базовая иконка */}
  <link rel="icon" href="/favicon.ico" />

  {/* png варианты */}
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />

  {/* apple */}
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</Head>



export type NextPageWithLayout<P = Record<string, never>, IP = P> = NextPage<
  P,
  IP
> & {
  getLayout?: (page: ReactElement, pageProps: P) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function DormUpApp({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout =
    Component.getLayout ??
    ((page: ReactElement) => <SiteLayout>{page}</SiteLayout>);

  return (
    <>
      <AnalyticsInitializer />
      {getLayout(<Component {...pageProps} />, pageProps)}
      <Footer />
      <CookieBanner />
    </>
  );
}

