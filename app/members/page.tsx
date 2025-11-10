import type { Metadata } from 'next';
import MembersClient from './MembersClient';
import { getInternalApiUrl } from '@/lib/api-config';

// SEO Metadata
export const metadata: Metadata = {
  title: 'Community Members | YoForex',
  description: 'Meet the YoForex community. Connect with expert traders, EA developers, and forex enthusiasts from around the world.',
  keywords: 'forex community, EA developers, trading experts, forex traders',
  openGraph: {
    title: 'Community Members | YoForex',
    description: 'Meet the YoForex community. Connect with expert traders, EA developers, and forex enthusiasts from around the world.',
    type: 'website',
    url: '/members',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Members | YoForex',
    description: 'Meet the YoForex community. Connect with expert traders, EA developers, and forex enthusiasts from around the world.',
  },
};

// Force dynamic rendering (SSR) - this page fetches from Express API
export const dynamic = 'force-dynamic';

// Enable ISR with 60-second revalidation (only applies at runtime, not during build)
export const revalidate = 60;

// Fetch initial members data from Express API
async function getInitialMembersData() {
  try {
    const EXPRESS_URL = getInternalApiUrl();
    
    // Fetch members and stats
    const [membersRes, statsRes] = await Promise.all([
      fetch(`${EXPRESS_URL}/api/members?limit=20&sort=coins`, {
        next: { revalidate: 60 },
      }),
      fetch(`${EXPRESS_URL}/api/members/stats`, {
        next: { revalidate: 60 },
      }),
    ]);

    const membersData = membersRes.ok ? await membersRes.json() : null;
    const statsData = statsRes.ok ? await statsRes.json() : null;

    return {
      members: membersData,
      stats: statsData,
    };
  } catch (error) {
    console.error('Error fetching initial members data:', error);
    return {
      members: null,
      stats: null,
    };
  }
}

export default async function MembersPage() {
  const initialData = await getInitialMembersData();

  return <MembersClient initialData={initialData} />;
}
