'use client';

import { Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { ForumCategory } from "@shared/schema";
import EnhancedThreadComposeClient from './EnhancedThreadComposeClient';

function ThreadComposeLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const defaultCategories: ForumCategory[] = [
  {
    slug: "general-discussion",
    name: "General Discussion",
    description: "General trading discussions",
    icon: "MessageSquare",
    color: "bg-blue-500",
    parentSlug: null,
    threadCount: 0,
    postCount: 0,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: "forex-strategies",
    name: "Forex Strategies",
    description: "Share and discuss forex trading strategies",
    icon: "TrendingUp",
    color: "bg-green-500",
    parentSlug: null,
    threadCount: 0,
    postCount: 0,
    sortOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: "expert-advisors",
    name: "Expert Advisors",
    description: "EA development and discussions",
    icon: "Bot",
    color: "bg-purple-500",
    parentSlug: null,
    threadCount: 0,
    postCount: 0,
    sortOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: "forex-indicators-mt4-mt5",
    name: "Forex Indicators MT4/MT5",
    description: "Technical indicators for MetaTrader platforms",
    icon: "Chart",
    color: "bg-indigo-500",
    parentSlug: null,
    threadCount: 0,
    postCount: 0,
    sortOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: "binary-options",
    name: "Binary Options",
    description: "Binary options strategies and indicators",
    icon: "Binary",
    color: "bg-red-500",
    parentSlug: null,
    threadCount: 0,
    postCount: 0,
    sortOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default function CreateThreadPage() {
  return (
    <Suspense fallback={<ThreadComposeLoading />}>
      <EnhancedThreadComposeClient categories={defaultCategories} />
    </Suspense>
  );
}
