import { Metadata } from 'next';
import Header from '@/components/Header';
import EnhancedFooter from '@/components/EnhancedFooter';
import LeaderboardClient from './LeaderboardClient';
import { getInternalApiUrl } from '@/lib/api-config';
import { ssrSafeFetch } from '@/lib/ssrSafeFetch';

// Force dynamic rendering to prevent build-time static generation errors
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leaderboard | YoForex',
  description: 'View the top contributors, publishers, and active members in the YoForex community. See who\'s leading the expert advisor marketplace.',
  keywords: 'leaderboard, top contributors, top traders, EA developers',
  openGraph: {
    title: 'Leaderboard | YoForex',
    description: 'View the top contributors, publishers, and active members in the YoForex community. See who\'s leading the expert advisor marketplace.',
    type: 'website',
    url: '/leaderboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leaderboard | YoForex',
    description: 'View the top contributors, publishers, and active members in the YoForex community. See who\'s leading the expert advisor marketplace.',
  },
};

export const revalidate = 60;

type CoinsLeader = {
  userId: string;
  username: string;
  balance: number;
  rank: number;
};

type ContributorLeader = {
  userId: string;
  username: string;
  helpfulCount: number;
  acceptedCount: number;
  totalContributions: number;
  rank: number;
};

type SellerLeader = {
  userId: string;
  username: string;
  totalRevenue: number;
  salesCount: number;
  rank: number;
};

async function getLeaderboardData() {
  const EXPRESS_URL = getInternalApiUrl();
  
  const [coinLeaders, contributors, sellers] = await Promise.all([
    ssrSafeFetch<CoinsLeader[]>(`${EXPRESS_URL}/api/leaderboards/coins`, {
      fallback: [],
      next: { revalidate: 60 } as any,
    }),
    ssrSafeFetch<ContributorLeader[]>(`${EXPRESS_URL}/api/leaderboards/contributors`, {
      fallback: [],
      next: { revalidate: 60 } as any,
    }),
    ssrSafeFetch<SellerLeader[]>(`${EXPRESS_URL}/api/leaderboards/sellers`, {
      fallback: [],
      next: { revalidate: 60 } as any,
    }),
  ]);

  return {
    coinLeaders,
    contributors,
    sellers,
  };
}

export default async function LeaderboardPage() {
  const { coinLeaders, contributors, sellers } = await getLeaderboardData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <LeaderboardClient 
        initialCoinLeaders={coinLeaders}
        initialContributors={contributors}
        initialSellers={sellers}
      />
      <EnhancedFooter />
    </div>
  );
}
