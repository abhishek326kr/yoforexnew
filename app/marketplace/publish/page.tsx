import type { Metadata } from 'next';
import PublishEAMultiStepClient from './PublishEAMultiStepClient';
import { getInternalApiUrl } from '../../lib/api-config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Generate SEO metadata
export const metadata: Metadata = {
  title: 'Publish Expert Advisor | YoForex Marketplace',
  description: 'Publish your MT4/MT5 Expert Advisor on YoForex marketplace. Share your automated trading system with thousands of traders and earn coins.',
  keywords: ['publish EA', 'sell EA', 'MT4 marketplace', 'MT5 expert advisor', 'trading system', 'forex robot'],
  robots: 'noindex, nofollow', // Don't index form pages
};

// Check authentication on server
async function checkAuth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("connect.sid");
    
    if (!sessionCookie) {
      return null;
    }

    const apiUrl = getInternalApiUrl();
    const response = await fetch(`${apiUrl}/api/me`, {
      signal: controller.signal,
      headers: { Cookie: `connect.sid=${sessionCookie.value}` },
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    return null;
  }
}

export default async function PublishEAPage() {
  // Check if user is authenticated
  const user = await checkAuth();
  
  if (!user) {
    // Redirect to home with a message (will trigger auth modal)
    redirect("/?action=login&redirect=/marketplace/publish");
  }

  return <PublishEAMultiStepClient />;
}