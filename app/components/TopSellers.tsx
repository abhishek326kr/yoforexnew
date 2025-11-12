"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, Coins, TrendingUp, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { RefreshButton } from "./RefreshButton";

interface TopSeller {
  id: string;
  slug: string;
  fullUrl?: string;
  title: string;
  type: "ea" | "indicator" | "article" | "source_code";
  priceCoins: number;
  isFree: boolean;
  postLogoUrl?: string | null;
  salesScore: number;
  totalSales: number;
  avgRating: number;
  reviewCount: number;
  downloads: number;
  author: {
    id?: string;
    username?: string;
    profileImageUrl?: string | null;
  };
}

interface TopSellersResponse {
  topSellers: TopSeller[];
  lastUpdated: string;
}

function TopSellers() {
  const { data, isLoading, refetch } = useQuery<TopSellersResponse>({
    queryKey: ["/api/content/top-sellers"],
    staleTime: 5 * 60 * 1000, // 5 minutes, no auto-refresh for performance
  });

  const topSellers = data?.topSellers?.slice(0, 5) || [];

  const getAnimationDelay = (index: number) => {
    const delays = [0, 50, 100, 150, 200];
    return delays[index] || 200;
  };

  const getRankBadge = (index: number) => {
    const badges = [
      { bg: "bg-amber-500", text: "text-white", shadow: "shadow-md" },
      { bg: "bg-slate-400", text: "text-white", shadow: "shadow-md" },
      { bg: "bg-orange-600", text: "text-white", shadow: "shadow-md" },
      { bg: "bg-blue-500", text: "text-white", shadow: "shadow-sm" },
      { bg: "bg-indigo-500", text: "text-white", shadow: "shadow-sm" },
    ];
    const badge = badges[index] || badges[4];
    return (
      <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center ${badge.bg} ${badge.text} ${badge.shadow} text-[10px] font-bold`}>
        {index + 1}
      </div>
    );
  };

  return (
    <Card className="card-depth-1 transition-smooth">
      <CardHeader className="glass-subtle pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            Top Sellers
          </CardTitle>
          <div className="flex items-center gap-1">
            <RefreshButton 
              onRefresh={async () => { await refetch(); }}
              size="icon"
              variant="ghost"
            />
            <Link href="/marketplace?sort=sales" data-testid="link-see-all-sellers">
              <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid="button-see-all-sellers">
                See All
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 py-2 px-2.5 glass-subtle animate-pulse rounded-lg"
              style={{ animationDelay: `${getAnimationDelay(index)}ms` }}
            >
              <Skeleton className="w-10 h-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))
        ) : topSellers.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="flex justify-center mb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                <ShoppingBag className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">No sellers yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon for top content</p>
          </div>
        ) : (
          // Content items
          topSellers.map((item, index) => (
            <Link key={item.id} href={item.fullUrl || `/content/${item.slug}`} data-testid={`link-seller-${item.id}`}>
              <div 
                className="flex items-center gap-3 py-2 px-2.5 rounded-lg transition-smooth hover-elevate hover-lift active-elevate-2 cursor-pointer animate-slide-up" 
                data-testid={`card-seller-${item.id}`}
                style={{ animationDelay: `${getAnimationDelay(index)}ms` }}
              >
                <div className="flex-shrink-0 relative">
                  <Avatar className="w-10 h-10 rounded-md">
                    <AvatarImage src={item.postLogoUrl || undefined} alt={item.title} />
                    <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-xs">
                      {item.title.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {getRankBadge(index)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-seller-title-${item.id}`}>
                    {item.title}
                  </h4>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground line-clamp-1" data-testid={`text-seller-author-${item.id}`}>
                      {item.author.username || "Unknown"}
                    </span>
                    {item.avgRating > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span className="text-xs text-foreground font-medium">{item.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item.isFree ? (
                    <Badge variant="secondary" className="text-[11px] px-1.5 font-semibold text-green-600">
                      FREE
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Coins className="w-3 h-3" />
                      <span>{item.priceCoins}</span>
                    </div>
                  )}
                  <Badge variant="secondary" className="text-[11px] px-1.5 font-normal">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    {item.totalSales} sales
                  </Badge>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default memo(TopSellers);
