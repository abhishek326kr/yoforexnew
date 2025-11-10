import { Metadata } from 'next';
import { KEYWORD_SETS, generateSEOMetadata } from '../components/seo/MetaTags';

// Dynamic metadata generator for threads
export function generateThreadMetadata(thread: any): Metadata {
  const keywords = [
    ...(thread.tags || []),
    ...KEYWORD_SETS.forum,
    thread.categoryName || 'forex'
  ];

  return generateSEOMetadata({
    title: `${thread.title} - ${thread.categoryName || 'Forum'} | YoForex`,
    description: thread.content ? 
      thread.content.substring(0, 150).replace(/<[^>]*>/g, '') + '...' :
      `Discussion about ${thread.title} in our forex trading community. Join the conversation and share your insights.`,
    keywords,
    url: `/thread/${thread.slug}`,
    type: 'article',
    author: thread.authorName,
    publishedTime: thread.createdAt,
    modifiedTime: thread.updatedAt
  });
}

// Dynamic metadata generator for EA/Content pages
export function generateContentMetadata(content: any): Metadata {
  const keywords = [
    ...(content.tags || []),
    ...KEYWORD_SETS.marketplace,
    content.type || 'EA',
    content.platform || 'MT4'
  ];

  return generateSEOMetadata({
    title: `${content.title} - ${content.type || 'EA'} for ${content.platform || 'MT4/MT5'} | YoForex`,
    description: content.description || 
      `Download ${content.title} - Professional ${content.type || 'Expert Advisor'} for ${content.platform || 'MetaTrader'}. Verified performance and user reviews.`,
    keywords,
    url: `/ea/${content.slug || content.id}`,
    type: 'product',
    author: content.vendorName || content.authorName,
    publishedTime: content.createdAt,
    modifiedTime: content.updatedAt
  });
}

// Dynamic metadata generator for user profiles
export function generateUserMetadata(user: any): Metadata {
  const keywords = [
    'forex trader',
    'trading profile',
    user.specialization || 'trader',
    ...KEYWORD_SETS.general
  ];

  return generateSEOMetadata({
    title: `${user.displayName || user.username} - Trader Profile | YoForex`,
    description: `View ${user.displayName || user.username}'s trading profile. ${user.bio || `Active member of YoForex community with ${user.reputationScore || 0} reputation points.`}`,
    keywords,
    url: `/user/${user.username}`,
    type: 'profile',
    author: user.displayName || user.username
  });
}

// Dynamic metadata generator for categories
export function generateCategoryMetadata(category: any): Metadata {
  const keywords = [
    category.name,
    `${category.name} forum`,
    `${category.name} discussion`,
    ...KEYWORD_SETS.forum
  ];

  return generateSEOMetadata({
    title: `${category.name} - Forum Category | YoForex`,
    description: category.description || 
      `Browse ${category.name} discussions. ${category.threadCount || 0} threads about ${category.name.toLowerCase()} in our forex trading community.`,
    keywords,
    url: `/category/${category.slug}`
  });
}

// Dynamic metadata generator for broker pages
export function generateBrokerMetadata(broker: any): Metadata {
  const keywords = [
    broker.name,
    `${broker.name} review`,
    `${broker.name} forex broker`,
    ...KEYWORD_SETS.brokers
  ];

  return generateSEOMetadata({
    title: `${broker.name} Review ${new Date().getFullYear()} - Broker Rating & User Reviews | YoForex`,
    description: `Read unbiased ${broker.name} review. Check spreads, leverage, regulation, and real user experiences. Rating: ${broker.rating || 'N/A'}/5 from ${broker.reviewCount || 0} reviews.`,
    keywords,
    url: `/brokers/${broker.slug}`,
    type: 'product',
    publishedTime: broker.createdAt,
    modifiedTime: broker.updatedAt
  });
}

// Dynamic metadata generator for guide pages
export function generateGuideMetadata(guide: any): Metadata {
  const keywords = [
    guide.title,
    'forex guide',
    'trading tutorial',
    ...KEYWORD_SETS.education,
    ...(guide.tags || [])
  ];

  return generateSEOMetadata({
    title: `${guide.title} - Trading Guide | YoForex`,
    description: guide.description || 
      `Learn ${guide.title}. Comprehensive forex trading guide with step-by-step instructions and expert tips.`,
    keywords,
    url: `/guides/${guide.slug}`,
    type: 'article',
    author: guide.author || 'YoForex Team',
    publishedTime: guide.publishedDate,
    modifiedTime: guide.updatedDate
  });
}

// Helper to generate metadata for search pages
export function generateSearchMetadata(query: string): Metadata {
  return generateSEOMetadata({
    title: `Search Results for "${query}" | YoForex`,
    description: `Find EAs, indicators, forum threads, and trading content matching "${query}" on YoForex.`,
    keywords: ['search', query, ...KEYWORD_SETS.general],
    url: `/search?q=${encodeURIComponent(query)}`,
    noindex: true // Search pages should not be indexed
  });
}

// Helper to generate metadata for paginated pages
export function generatePaginatedMetadata(
  baseTitle: string,
  baseDescription: string,
  page: number,
  totalPages: number,
  url: string
): Metadata {
  const title = page > 1 ? `${baseTitle} - Page ${page} of ${totalPages}` : baseTitle;
  const description = page > 1 
    ? `${baseDescription} Page ${page} of ${totalPages}.`
    : baseDescription;

  return generateSEOMetadata({
    title,
    description,
    url: page > 1 ? `${url}?page=${page}` : url,
    noindex: page > 2 // Index first 2 pages only
  });
}

// Helper for admin/dashboard pages (should not be indexed)
export function generatePrivateMetadata(title: string): Metadata {
  return {
    title: `${title} | YoForex`,
    robots: {
      index: false,
      follow: false
    }
  };
}