import type { Metadata } from 'next';
import { Suspense } from 'react';
import MarketplaceClient from './MarketplaceClient';
import { getInternalApiUrl } from '../lib/api-config';
import { getMetadataWithOverrides } from '../lib/metadata-helper';

// Enable ISR with 60-second revalidation
export const revalidate = 60;

// Generate SEO metadata with overrides
export async function generateMetadata(): Promise<Metadata> {
  return await getMetadataWithOverrides('/marketplace', {
    title: 'EA & Indicator Marketplace | YoForex',
    description: 'Browse and download expert advisors (EAs) and indicators for MT4/MT5. Find free and premium trading tools from expert developers.',
    keywords: ['forex EA', 'MT4 indicators', 'MT5 expert advisor', 'trading tools', 'forex marketplace'],
    openGraph: {
      title: 'EA & Indicator Marketplace | YoForex',
      description: 'Browse and download expert advisors (EAs) and indicators for MT4/MT5. Find free and premium trading tools from expert developers.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'EA & Indicator Marketplace | YoForex',
      description: 'Browse and download expert advisors (EAs) and indicators for MT4/MT5. Find free and premium trading tools from expert developers.',
    },
  });
}

// Fetch marketplace content from Express API
async function getMarketplaceContent() {
  try {
    // Use centralized API config for SSR
    const apiUrl = getInternalApiUrl();
    const res = await fetch(`${apiUrl}/api/content?status=approved`, {
      next: { revalidate: 60 },
    });
    
    if (!res.ok) {
      console.error('Failed to fetch marketplace content:', res.status, res.statusText);
      return [];
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching marketplace content:', error);
    return [];
  }
}

// Loading component for Suspense fallback
function MarketplaceLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-64 mb-4"></div>
        <div className="h-4 bg-muted rounded w-96 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const initialContent = await getMarketplaceContent();
  
  // Parse search params on the server
  const params = await searchParams;
  const initialFilters = {
    search: typeof params.search === 'string' ? params.search : '',
    category: typeof params.category === 'string' ? params.category : 'all',
    sortBy: typeof params.sortBy === 'string' ? params.sortBy : 'recent',
  };

  return (
    <Suspense fallback={<MarketplaceLoading />}>
      <MarketplaceClient 
        initialContent={initialContent} 
        initialFilters={initialFilters}
      />
    </Suspense>
  );
}
