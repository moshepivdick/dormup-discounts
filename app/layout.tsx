import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from './providers/AuthProvider';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { CookieBanner } from '@/components/CookieBanner';
import { Footer } from '@/components/Footer';
import { AnalyticsInitializer } from '@/components/AnalyticsInitializer';

export const metadata: Metadata = {
  title: 'DormUp Discounts',
  description: 'Student discounts across partner cafes, pizzerias and bars in Rimini & Bologna.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientErrorBoundary>
          <AuthProvider>
            <AnalyticsInitializer />
            {children}
            <Footer />
            <CookieBanner />
          </AuthProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}





