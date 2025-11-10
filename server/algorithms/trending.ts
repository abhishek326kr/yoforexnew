import type { ForumThread } from "@shared/schema";

/**
 * Calculate "hot" score for trending threads
 * Formula: (likes - dislikes) + (replies * 0.5) + (views * 0.1) / time_decay
 * 
 * Factors:
 * - Likes (positive weight)
 * - Replies (medium weight: 0.5)
 * - Views (low weight: 0.1)
 * - Time decay (gravity factor)
 * - Pinned threads get bonus
 */
export function calculateHotScore(thread: ForumThread & { likesCount?: number }): number {
  const now = Date.now();
  const createdAt = new Date(thread.createdAt!).getTime();
  const ageInHours = (now - createdAt) / (1000 * 60 * 60);
  
  // Calculate engagement score using audit formula
  const likes = thread.likesCount || 0;
  const replies = thread.replyCount || 0;
  const views = thread.views || 0;
  const isPinned = thread.isPinned || false;
  
  // Score based on audit requirements:
  // (likes - dislikes) + (replies * 0.5) + (views * 0.1)
  // Note: We don't have dislikes in our schema, so just using likes
  const baseScore = (
    likes +                 // Likes count (no dislikes in system)
    replies * 0.5 +        // Replies weight as per audit
    views * 0.1            // Views have low weight as per audit
  );
  
  // Apply time decay (gravity = 1.8 like Reddit)
  // Add 2 hours to avoid division by zero
  const gravity = 1.8;
  const decayFactor = Math.pow(ageInHours + 2, gravity);
  
  // Final score with time decay and pinned bonus
  const hotScore = (baseScore / decayFactor) + (isPinned ? 100 : 0);
  
  return hotScore;
}

/**
 * Get cached trending threads
 * Cache lasts 5 minutes to reduce computational load
 */
interface TrendingCache {
  threads: ForumThread[];
  timestamp: number;
}

let cache: TrendingCache = {
  threads: [],
  timestamp: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getTrendingThreads(
  allThreads: ForumThread[],
  limit: number = 10,
  useCache: boolean = true
): ForumThread[] {
  // Return cached if still valid
  if (useCache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.threads.slice(0, limit);
  }
  
  // Calculate hot scores and sort
  const threadsWithScores = allThreads.map((thread) => ({
    ...thread,
    hotScore: calculateHotScore(thread),
  }));
  
  const trending = threadsWithScores
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, limit);
  
  // Update cache
  if (useCache) {
    cache = {
      threads: trending,
      timestamp: Date.now(),
    };
  }
  
  return trending;
}

/**
 * Clear the trending cache
 * Useful when new threads are created or updated
 */
export function clearTrendingCache(): void {
  cache = {
    threads: [],
    timestamp: 0,
  };
}
