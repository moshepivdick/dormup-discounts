import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from './providers/AuthProvider';

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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}





