import type { Metadata } from 'next';
import PublishEAMultiStepClient from './PublishEAMultiStepClient';

export const dynamic = 'force-dynamic';

// Generate SEO metadata
export const metadata: Metadata = {
  title: 'Publish Expert Advisor | YoForex Marketplace',
  description: 'Publish your MT4/MT5 Expert Advisor on YoForex marketplace. Share your automated trading system with thousands of traders and earn coins.',
  keywords: ['publish EA', 'sell EA', 'MT4 marketplace', 'MT5 expert advisor', 'trading system', 'forex robot'],
  robots: 'noindex, nofollow', // Don't index form pages
};

export default function PublishEAPage() {
  // Authentication is handled client-side by the PublishEAMultiStepClient component
  return <PublishEAMultiStepClient />;
}