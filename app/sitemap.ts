import type { MetadataRoute } from 'next';
import { db } from '../lib/db';
import { forumThreads, content, users, forumCategories, seoCategories } from '../shared/schema';
import { desc, eq } from 'drizzle-orm';
import type { ForumThread, Content, User, ForumCategory, SeoCategory } from '../shared/schema';
import { getCategoryPath, getThreadUrl, getContentUrl } from '../lib/category-path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yoforex.net';

  // Fetch all threads
  const threads = await db.query.forumThreads.findMany({
    orderBy: [desc(forumThreads.updatedAt)],
    limit: 1000,
  });

  // Fetch all content
  const contentItems = await db.query.content.findMany({
    orderBy: [desc(content.updatedAt)],
    limit: 1000,
  });

  // Fetch all users
  const userProfiles = await db.query.users.findMany({
    orderBy: [desc(users.reputationScore)],
    limit: 500,
  });

  // Fetch all forum categories
  const categories = await db.query.forumCategories.findMany();
  
  // Warm up category path cache for performance (before concurrent calls)
  console.log(`[SITEMAP] Warming cache for ${categories.length} categories...`);
  for (const category of categories) {
    await getCategoryPath(category.slug); // Populate cache sequentially
  }
  console.log(`[SITEMAP] Cache warmed successfully`);
  
  // Fetch all SEO categories
  const seoCategoriesList = await db
    .select()
    .from(seoCategories)
    .where(eq(seoCategories.isActive, true));

  // Filter threads with valid categories (now using cached paths)
  const validThreads = await Promise.all(
    threads.map(async (thread: ForumThread) => {
      if (!thread.categorySlug) return null;
      const categoryPath = await getCategoryPath(thread.categorySlug);
      return categoryPath ? thread : null;
    })
  );
  const filteredThreads = validThreads.filter(Boolean) as ForumThread[];
  
  console.log(`[SITEMAP] Threads: ${threads.length} total, ${filteredThreads.length} valid, ${threads.length - filteredThreads.length} skipped`);

  // Generate hierarchical URLs for threads in parallel
  const threadUrls = await Promise.all(
    filteredThreads.map(async (thread: ForumThread) => ({
      url: `${baseUrl}${await getThreadUrl(thread)}`,
      lastModified: thread.updatedAt ? new Date(thread.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  // Filter content with valid categories
  const validContent = await Promise.all(
    contentItems.map(async (item: Content) => {
      if (!item.category) return null;
      const categoryPath = await getCategoryPath(item.category);
      return categoryPath ? item : null;
    })
  );
  const filteredContent = validContent.filter(Boolean) as Content[];
  
  console.log(`[SITEMAP] Content: ${contentItems.length} total, ${filteredContent.length} valid, ${contentItems.length - filteredContent.length} skipped`);

  // Generate hierarchical URLs for content in parallel
  const contentUrls = await Promise.all(
    filteredContent.map(async (item: Content) => ({
      url: `${baseUrl}${await getContentUrl(item)}`,
      lastModified: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))
  );

  // Generate hierarchical URLs for forum categories in parallel
  const categoryUrls = await Promise.all(
    categories.map(async (category: ForumCategory) => ({
      url: `${baseUrl}/category/${await getCategoryPath(category.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))
  );
  
  // Generate SEO-optimized category URLs
  const seoCategoryUrls = seoCategoriesList.map((category: SeoCategory) => ({
    url: `${baseUrl}${category.urlPath}`,
    lastModified: category.updatedAt ? new Date(category.updatedAt) : new Date(),
    changeFrequency: 'daily' as const,
    priority: category.categoryType === 'main' ? 0.9 : 0.8,
  }));

  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Forum threads (hierarchical URLs)
    ...threadUrls,
    // Marketplace content (hierarchical URLs)
    ...contentUrls,
    // User profiles
    ...userProfiles.map((user: User) => ({
      url: `${baseUrl}/user/${user.username}`,
      lastModified: user.updatedAt ? new Date(user.updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    // Categories (hierarchical URLs)
    ...categoryUrls,
    // SEO-optimized category pages
    ...seoCategoryUrls,
    // SEO Landing Pages - High Priority
    {
      url: `${baseUrl}/best-forex-ea`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/forex-signals`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/mt4-vs-mt5`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/forex-trading-guide`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    // Static pages
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/discussions`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/brokers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];
}
