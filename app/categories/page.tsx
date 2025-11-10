import type { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';
import type { ForumCategory } from '@shared/schema';
import { getInternalApiUrl } from '../lib/api-config';

// Force dynamic rendering (SSR) - this page fetches from Express API
export const dynamic = 'force-dynamic';

// Enable ISR with 60-second revalidation (only applies at runtime, not during build)
export const revalidate = 60;

// SEO Metadata as specified in requirements
export const metadata: Metadata = {
  title: 'Forum Categories | YoForex',
  description: 'Browse all forum categories on YoForex. Find discussions about expert advisors, indicators, brokers, trading strategies, and more.',
  keywords: 'forum categories, EA categories, trading topics, forex discussion categories',
  openGraph: {
    title: 'Forum Categories | YoForex',
    description: 'Browse all forum categories on YoForex. Find discussions about expert advisors, indicators, brokers, trading strategies, and more.',
    type: 'website',
    url: 'https://yoforex.net/categories',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forum Categories | YoForex',
    description: 'Browse all forum categories on YoForex. Find discussions about expert advisors, indicators, brokers, trading strategies, and more.',
  },
};

// Server Component
export default async function CategoriesPage() {
  // Fetch categories from Express API
  let initialCategories: ForumCategory[] = [];
  
  try {
    const apiUrl = getInternalApiUrl();
    const res = await fetch(`${apiUrl}/api/categories`, {
      next: { revalidate: 60 },
    });

    if (res.ok) {
      initialCategories = await res.json();
    } else {
      console.warn('[Categories Page] API returned non-OK status:', res.status);
    }
  } catch (error: any) {
    // Graceful error handling for build time and runtime
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn('[Categories Page] API unavailable, using fallback data');
    } else {
      console.error('[Categories Page] Error fetching categories:', error.message);
    }
    initialCategories = [];
  }

  // Pass data to Client Component
  return <CategoriesClient initialCategories={initialCategories} />;
}
