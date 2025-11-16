import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchClient from './SearchClient';
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering to prevent build-time static generation errors
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search | YoForex',
  description: 'Search across forums, members, marketplace, and brokers on YoForex.',
  openGraph: {
    title: 'Search | YoForex',
    description: 'Search across forums, members, marketplace, and brokers on YoForex.',
    type: 'website',
  },
};

function SearchLoading() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-64 mb-4"></div>
        <div className="h-10 bg-muted rounded mb-6"></div>
        <div className="flex gap-2 mb-8">
          <div className="h-10 bg-muted rounded w-32"></div>
          <div className="h-10 bg-muted rounded w-32"></div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
}) {
  const params = await searchParams;
  
  const initialQuery = {
    q: typeof params.q === 'string' ? params.q : undefined,
    type: typeof params.type === 'string' ? params.type : undefined,
    sort: typeof params.sort === 'string' ? params.sort : undefined,
  };

  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchClient initialQuery={initialQuery} />
    </Suspense>
  );
}