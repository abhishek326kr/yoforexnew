"use client";

import { useEffect, useState } from "react";
import EnhancedThreadComposeClient from "./EnhancedThreadComposeClient";
// import ThreadComposeWithErrorBoundary from "./ThreadComposeWithErrorBoundary";
// import SimpleThreadCompose from "./SimpleThreadCompose";
import type { ForumCategory } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function CreateThreadPage() {
  // Hardcode categories initially to ensure page loads
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

  const [categories, setCategories] = useState<ForumCategory[]>(defaultCategories);
  const [loading, setLoading] = useState(false); // Start with false to show content immediately
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[CreateThreadPage] useEffect running on client...');
    
    async function fetchCategories() {
      try {
        console.log('[CreateThreadPage] Starting to fetch categories from /api/categories...');
        const res = await fetch('/api/categories', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log('[CreateThreadPage] Fetch response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[CreateThreadPage] Categories fetched successfully:', data?.length || 0, 'categories');
          if (data && data.length > 0) {
            setCategories(data);
          }
        } else {
          console.log('[CreateThreadPage] Using default categories due to fetch error');
        }
      } catch (error) {
        console.log('[CreateThreadPage] Error fetching categories, using defaults:', error);
        // Keep using default categories
      }
    }

    // Fetch categories but don't block the page
    fetchCategories();
  }, []);

  // Show loading skeleton
  if (loading) {
    console.log('[CreateThreadPage] Showing loading skeleton...');
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <Card className="p-8">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.log('[CreateThreadPage] Showing error state:', error);
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            Error loading categories: {error}
          </div>
        </div>
      </div>
    );
  }

  console.log('[CreateThreadPage] Rendering EnhancedThreadComposeClient with categories:', categories?.length || 0);
  // return <ThreadComposeWithErrorBoundary categories={categories} />;
  return <EnhancedThreadComposeClient categories={categories} />;
  // return <SimpleThreadCompose categories={categories} />;
}