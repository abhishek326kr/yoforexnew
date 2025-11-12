
"use client";

import * as React from "react";
import { MessageSquare, Users, MessagesSquare, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import CountUp from "react-countup";
import { RefreshButton } from "./RefreshButton";

interface StatsData {
  totalThreads: number;
  totalMembers: number;
  totalPosts: number;
  todayActivity: {
    threads: number;
    content: number;
  };
}

interface StatsBarProps {
  initialStats?: StatsData;
}

export default function StatsBar({ initialStats }: StatsBarProps) {
  const [mounted, setMounted] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const { data, isLoading, refetch } = useQuery<StatsData>({
    queryKey: ['/api/stats'],
    initialData: initialStats,
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  const stats = [
    { 
      label: "Forum Threads", 
      rawValue: data?.totalThreads !== undefined ? data.totalThreads : 0,
      icon: MessageSquare, 
      key: "threads",
      delay: 0
    },
    { 
      label: "Community Members", 
      rawValue: data?.totalMembers !== undefined ? data.totalMembers : 0,
      icon: Users, 
      key: "members",
      delay: 100
    },
    { 
      label: "Total Replies", 
      rawValue: data?.totalPosts !== undefined ? data.totalPosts : 0,
      icon: MessagesSquare, 
      key: "replies",
      delay: 200
    },
    { 
      label: "Active Today", 
      rawValue: data?.todayActivity?.threads !== undefined ? data.todayActivity.threads : 0,
      icon: Activity, 
      key: "activity",
      delay: 300,
      isIncrement: true
    }
  ];

  if (isLoading && !data) {
    return (
      <div className="border-y bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 md:py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="glass-subtle card-depth-1 rounded-md px-4 py-5 relative overflow-hidden"
              >
                <div className="absolute inset-0 shimmer" />
                <div className="flex flex-col items-center justify-center gap-3 relative z-10">
                  <div className="bg-muted/60 rounded-md h-10 w-10" />
                  <div className="h-7 w-16 bg-muted/60 rounded" />
                  <div className="h-4 w-24 bg-muted/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-y bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 py-4 md:py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Platform Statistics
          </div>
          <RefreshButton 
            onRefresh={async () => { await refetch(); }}
            size="icon"
            variant="ghost"
            className="h-7 w-7 -mr-1"
            data-testid="button-refresh-stats"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.key} 
              className={`
                glass-subtle card-depth-1 hover-lift transition-smooth rounded-md px-4 py-5
                animate-slide-up animate-delay-${stat.delay}
              `}
              style={{
                animationDelay: prefersReducedMotion ? '0ms' : `${stat.delay}ms`
              }}
            >
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-gradient-primary rounded-md p-2.5 shadow-sm">
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                </div>
                
                <div 
                  className="text-2xl md:text-3xl font-bold leading-none tracking-tight" 
                  data-testid={`text-stat-${stat.key}`} 
                  suppressHydrationWarning
                >
                  {stat.isIncrement && "+"}
                  {mounted && !prefersReducedMotion ? (
                    <CountUp 
                      end={stat.rawValue} 
                      duration={2}
                      separator=","
                      useEasing={true}
                      easingFn={(t, b, c, d) => {
                        t /= d / 2;
                        if (t < 1) return c / 2 * t * t + b;
                        t--;
                        return -c / 2 * (t * (t - 2) - 1) + b;
                      }}
                    />
                  ) : (
                    stat.rawValue.toLocaleString('en-US')
                  )}
                </div>
                
                <div className="text-xs md:text-sm text-muted-foreground font-medium leading-tight">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
