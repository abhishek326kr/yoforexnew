import type { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';
import type { ForumCategory } from '@shared/schema';
import { getInternalApiUrl } from '@/lib/api-config';
import { ssrSafeFetch } from '@/lib/ssrSafeFetch';

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
  const apiUrl = getInternalApiUrl();
  
  // Fetch categories from Express API with SSR-safe fallback
  const initialCategories = await ssrSafeFetch<ForumCategory[]>(`${apiUrl}/api/categories`, {
    fallback: [],
    next: { revalidate: 60 } as any,
  });

  // Pass data to Client Component
  return <CategoriesClient initialCategories={initialCategories} />;
}
