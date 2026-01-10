import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from './providers/AuthProvider';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';

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
          <AuthProvider>{children}</AuthProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}





