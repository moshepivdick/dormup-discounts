import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Check if Supabase environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      // In production, you might want to redirect to an error page
      // For now, we'll allow the page to render and let client-side handle auth
      return <>{children}</>;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If there's an error getting the user or no user, redirect to signup
    if (error || !user) {
      redirect('/(auth)/signup');
    }

    return <>{children}</>;
  } catch (error) {
    // Log the error for debugging (in development)
    console.error('Error in AppLayout:', error);
    
    // In production, we don't want to expose error details
    // Redirect to signup page as fallback
    redirect('/(auth)/signup');
  }
}



