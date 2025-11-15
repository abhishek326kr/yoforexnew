import type { Metadata } from 'next';
import HomeClient from '@/HomeClient';
import { getInternalApiUrl } from '@/lib/api-config';
import JsonLd from '@/components/JsonLd';
import { generateOrganizationSchema, generateWebSiteSchema, SITE_CONFIG } from '@/lib/schema-generator';
import { ssrSafeFetch } from '@/lib/ssrSafeFetch';

// Enable ISR with 60-second revalidation (only applies at runtime, not during build)
export const revalidate = 60;

// Homepage metadata
export const metadata: Metadata = {
  title: 'YoForex - Expert Advisor Forum & EA Marketplace | Free MT4/MT5 EAs',
  description: 'Join 10,000+ forex traders. Download free EAs, share strategies, and earn coins. #1 MT4/MT5 EA community with verified backtests.',
  keywords: ['forex forum', 'EA marketplace', 'Expert Advisor', 'MT4', 'MT5', 'forex trading', 'algorithmic trading', 'free EAs', 'trading robots'],
  openGraph: {
    title: 'YoForex - Expert Advisor Forum & EA Marketplace',
    description: 'Join 10,000+ forex traders. Download free EAs, share strategies, and earn coins.',
    url: 'https://yoforex.net',
    siteName: 'YoForex',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'YoForex - Expert Advisor Forum & EA Marketplace',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YoForex - Expert Advisor Forum & EA Marketplace',
    description: 'Join 10,000+ forex traders. Download free EAs, share strategies, and earn coins.',
    images: ['/og-image.svg'],
    creator: '@YoForex',
  },
  alternates: {
    canonical: 'https://yoforex.net',
  }
};

export default async function HomePage() {
  const apiUrl = getInternalApiUrl();
  
  // Parallel data fetching from Express API with SSR-safe fallbacks
  const [stats, topCategories, threads] = await Promise.all([
    ssrSafeFetch(`${apiUrl}/api/stats`, {
      fallback: null,
      next: { revalidate: 60 } as any,
      headers: {
        'Accept': 'application/json',
      },
    }),
    ssrSafeFetch(`${apiUrl}/api/categories/tree/top?limit=6`, {
      fallback: null,
      next: { revalidate: 60 } as any,
      headers: {
        'Accept': 'application/json',
      },
    }),
    ssrSafeFetch(`${apiUrl}/api/threads`, {
      fallback: null,
      next: { revalidate: 60 } as any,
      headers: {
        'Accept': 'application/json',
      },
    }),
  ]);

  // Generate structured data schemas for homepage
  const organizationSchema = generateOrganizationSchema(SITE_CONFIG);
  const websiteSchema = generateWebSiteSchema(SITE_CONFIG);

  return (
    <>
      <JsonLd schema={{ '@graph': [organizationSchema, websiteSchema] }} />
      <HomeClient 
        initialStats={stats}
        initialCategories={topCategories}
        initialThreads={threads}
      />
    </>
  );
}
