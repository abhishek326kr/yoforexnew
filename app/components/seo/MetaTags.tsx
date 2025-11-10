import { Metadata } from 'next';

// Helper function to generate metadata for pages
export function generateSEOMetadata({
  title,
  description,
  keywords = [],
  image = '/og-image.svg',
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
  nofollow = false
}: {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  nofollow?: boolean;
}): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoforex.net';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  // Ensure title and description are within optimal lengths
  const optimizedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const optimizedDescription = description.length > 160 
    ? description.substring(0, 157) + '...' 
    : description;

  const metadata: Metadata = {
    title: optimizedTitle,
    description: optimizedDescription,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'YoForex' }],
    openGraph: {
      title: optimizedTitle,
      description: optimizedDescription,
      url: fullUrl,
      siteName: 'YoForex',
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: type === 'article' ? 'article' : type === 'profile' ? 'profile' : 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: optimizedTitle,
      description: optimizedDescription,
      images: [fullImageUrl],
      site: '@YoForex',
      creator: author ? `@${author.replace(/\s+/g, '')}` : '@YoForex',
    },
    alternates: {
      canonical: fullUrl,
    },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
  };

  // Add article-specific metadata
  if (type === 'article' && publishedTime) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      publishedTime,
      modifiedTime: modifiedTime || publishedTime,
      authors: author ? [author] : ['YoForex'],
    };
  }

  // Add product-specific metadata for marketplace items
  if (type === 'product') {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'website', // OpenGraph doesn't have a 'product' type, use website
    };
  }

  return metadata;
}

// Common keyword sets for different page types
export const KEYWORD_SETS = {
  general: [
    'forex', 'trading', 'EA', 'Expert Advisor', 
    'MT4', 'MT5', 'MetaTrader', 'algorithmic trading'
  ],
  marketplace: [
    'forex EA', 'trading robots', 'MT4 EA', 'MT5 EA',
    'Expert Advisor marketplace', 'automated trading',
    'forex robots', 'trading systems'
  ],
  forum: [
    'forex forum', 'trading community', 'forex discussion',
    'trading strategies', 'forex tips', 'trading advice',
    'forex education', 'trading knowledge'
  ],
  signals: [
    'forex signals', 'trading signals', 'buy sell signals',
    'forex alerts', 'trading alerts', 'signal service',
    'forex recommendations', 'trading tips'
  ],
  brokers: [
    'forex brokers', 'broker reviews', 'broker comparison',
    'best forex brokers', 'regulated brokers', 'broker ratings',
    'forex broker guide', 'trusted brokers'
  ],
  education: [
    'forex education', 'trading guide', 'forex tutorial',
    'learn forex', 'trading basics', 'forex strategy',
    'trading course', 'forex learning'
  ]
};

// Page-specific metadata generators
export const PAGE_METADATA = {
  home: () => generateSEOMetadata({
    title: 'YoForex - Expert Advisor Forum & EA Marketplace',
    description: 'Join 10,000+ forex traders. Download free EAs, share strategies, and earn coins. #1 MT4/MT5 EA community with verified backtests and live results.',
    keywords: KEYWORD_SETS.general,
    url: '/'
  }),
  
  marketplace: () => generateSEOMetadata({
    title: 'EA Marketplace - Buy & Sell Expert Advisors | YoForex',
    description: 'Browse 1000+ verified Expert Advisors for MT4/MT5. Find profitable trading robots, indicators, and scripts. All EAs tested with real results.',
    keywords: KEYWORD_SETS.marketplace,
    url: '/marketplace'
  }),
  
  discussions: () => generateSEOMetadata({
    title: 'Forex Forum - Trading Discussions & Strategies | YoForex',
    description: 'Join active forex discussions. Share trading strategies, get market analysis, and learn from experienced traders in our community forum.',
    keywords: KEYWORD_SETS.forum,
    url: '/discussions'
  }),
  
  categories: () => generateSEOMetadata({
    title: 'Forum Categories - Browse All Trading Topics | YoForex',
    description: 'Explore forex trading categories including strategies, EAs, indicators, brokers, education, and market analysis. Find your trading niche.',
    keywords: [...KEYWORD_SETS.forum, 'forum categories', 'trading topics'],
    url: '/categories'
  }),
  
  bestEA: () => generateSEOMetadata({
    title: 'Best Forex EA 2025 - Top Expert Advisors Ranked | YoForex',
    description: 'Discover the best forex Expert Advisors for 2025. Compare top-performing EAs with verified results, user reviews, and detailed analytics.',
    keywords: [...KEYWORD_SETS.marketplace, 'best EA 2025', 'top forex robots'],
    url: '/best-forex-ea'
  }),
  
  forexSignals: () => generateSEOMetadata({
    title: 'Free Forex Signals - Live Trading Alerts | YoForex',
    description: 'Get free forex signals with 80%+ accuracy. Real-time trading alerts for major pairs. Join 5000+ traders receiving daily signals.',
    keywords: KEYWORD_SETS.signals,
    url: '/forex-signals'
  }),
  
  brokers: () => generateSEOMetadata({
    title: 'Forex Broker Reviews & Comparisons 2025 | YoForex',
    description: 'Compare top forex brokers with unbiased reviews. Find the best broker for your trading style with our detailed comparison tools.',
    keywords: KEYWORD_SETS.brokers,
    url: '/brokers'
  }),
  
  tradingGuide: () => generateSEOMetadata({
    title: 'Complete Forex Trading Guide for Beginners | YoForex',
    description: 'Learn forex trading from basics to advanced strategies. Free comprehensive guide covering analysis, risk management, and profitable trading.',
    keywords: KEYWORD_SETS.education,
    url: '/forex-trading-guide'
  }),
  
  mt4VsMt5: () => generateSEOMetadata({
    title: 'MT4 vs MT5 - Which Platform Is Better in 2025? | YoForex',
    description: 'Detailed comparison of MetaTrader 4 vs MetaTrader 5. Discover key differences, advantages, and which platform suits your trading needs.',
    keywords: ['MT4 vs MT5', 'MetaTrader comparison', 'MT4 MT5 differences', 'trading platform comparison'],
    url: '/mt4-vs-mt5'
  }),
  
  members: () => generateSEOMetadata({
    title: 'Trading Community Members - Connect with Traders | YoForex',
    description: 'Meet our global community of forex traders. Connect, follow top performers, and learn from successful traders worldwide.',
    keywords: ['forex traders', 'trading community', 'forex members', 'trader profiles'],
    url: '/members'
  }),
  
  leaderboard: () => generateSEOMetadata({
    title: 'Top Traders Leaderboard - Best Performers | YoForex',
    description: 'See who\'s leading our trading community. Monthly leaderboard showcasing top contributors, EA developers, and successful traders.',
    keywords: ['trading leaderboard', 'top traders', 'best forex traders', 'trader rankings'],
    url: '/leaderboard'
  }),
  
  support: () => generateSEOMetadata({
    title: 'Support Center - Help & FAQ | YoForex',
    description: 'Get help with your YoForex account. Find answers to common questions, contact support, and access our knowledge base.',
    keywords: ['forex support', 'help center', 'FAQ', 'contact support'],
    url: '/support'
  })
};