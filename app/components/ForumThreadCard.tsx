"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Eye, TrendingUp, CheckCircle2, Coins, FileText, Activity, BarChart3, HelpCircle, MessageSquare, Star, BookOpen, Lightbulb, Code } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ForumThreadCardProps {
  id: string;
  slug?: string;
  fullUrl?: string;
  title: string;
  excerpt: string;
  author: {
    name: string;
    avatar?: string;
    reputation: number;
  };
  category: string;
  threadType?: "question" | "discussion" | "review" | "journal" | "guide" | "program_sharing";
  replyCount: number;
  viewCount: number;
  coinsEarned?: number;
  isAnswered?: boolean;
  isPinned?: boolean;
  hasSetFile?: boolean;
  hasBacktest?: boolean;
  isLiveVerified?: boolean;
  lastActivity: Date;
}

const getCategoryStyles = (category: string) => {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('strategy') || categoryLower.includes('discussion')) {
    return {
      borderColor: 'border-l-blue-500',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
      badgeText: 'text-blue-700 dark:text-blue-300',
    };
  }
  
  if (categoryLower.includes('performance') || categoryLower.includes('report')) {
    return {
      borderColor: 'border-l-green-500',
      badgeBg: 'bg-green-50 dark:bg-green-950/50',
      badgeText: 'text-green-700 dark:text-green-300',
    };
  }
  
  if (categoryLower.includes('news') || categoryLower.includes('update')) {
    return {
      borderColor: 'border-l-orange-500',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/50',
      badgeText: 'text-orange-700 dark:text-orange-300',
    };
  }
  
  if (categoryLower.includes('ea') || categoryLower.includes('library')) {
    return {
      borderColor: 'border-l-purple-500',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
      badgeText: 'text-purple-700 dark:text-purple-300',
    };
  }
  
  if (categoryLower.includes('algorithm') || categoryLower.includes('development')) {
    return {
      borderColor: 'border-l-indigo-500',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
    };
  }
  
  if (categoryLower.includes('backtest')) {
    return {
      borderColor: 'border-l-cyan-500',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50',
      badgeText: 'text-cyan-700 dark:text-cyan-300',
    };
  }
  
  return {
    borderColor: 'border-l-gray-300 dark:border-l-gray-700',
    badgeBg: 'bg-gray-50 dark:bg-gray-900',
    badgeText: 'text-gray-700 dark:text-gray-300',
  };
};

const threadTypeConfig = {
  question: { icon: HelpCircle, label: "Question", color: "text-blue-600 dark:text-blue-400" },
  discussion: { icon: MessageSquare, label: "Discussion", color: "text-gray-600 dark:text-gray-400" },
  review: { icon: Star, label: "Review", color: "text-yellow-600 dark:text-yellow-400" },
  journal: { icon: BookOpen, label: "Journal", color: "text-purple-600 dark:text-purple-400" },
  guide: { icon: Lightbulb, label: "Guide", color: "text-green-600 dark:text-green-400" },
  program_sharing: { icon: Code, label: "Program", color: "text-indigo-600 dark:text-indigo-400" },
};

export default function ForumThreadCard({
  id,
  slug,
  fullUrl,
  title,
  excerpt,
  author,
  category,
  threadType = "discussion",
  replyCount,
  viewCount,
  coinsEarned = 0,
  isAnswered = false,
  isPinned = false,
  hasSetFile = false,
  hasBacktest = false,
  isLiveVerified = false,
  lastActivity
}: ForumThreadCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");
  const [formattedViews, setFormattedViews] = useState<string>("");
  
  useEffect(() => {
    setTimeAgo(formatDistanceToNow(lastActivity, { addSuffix: true }));
    setFormattedViews(viewCount.toLocaleString('en-US'));
  }, [lastActivity, viewCount]);
  
  const categoryStyles = getCategoryStyles(category);
  const threadUrl = fullUrl || (slug ? `/thread/${slug}` : `/thread/${id}`);
  const threadConfig = threadTypeConfig[threadType];
  const ThreadIcon = threadConfig.icon;
  
  return (
    <Link href={threadUrl} data-testid={`link-thread-${id}`}>
      <Card 
        className={`
          border-0
          ${categoryStyles.borderColor} border-l-[3px] 
          card-depth-1 hover-lift
          hover-elevate active-elevate-2
          transition-smooth
        `} 
        data-testid="card-forum-thread"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={author?.avatar} />
              <AvatarFallback className="text-xs">
                {author?.name ? author.name.slice(0, 2).toUpperCase() : 'UN'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {isPinned && (
                  <Badge variant="secondary" className="text-xs h-5 px-2 transition-smooth">Pinned</Badge>
                )}
                <Badge 
                  variant="outline"
                  className={`text-xs h-5 px-2 transition-smooth ${threadConfig.color}`}
                  data-testid="badge-thread-type"
                >
                  <ThreadIcon className="h-3 w-3 mr-1" />
                  {threadConfig.label}
                </Badge>
                <Badge 
                  className={`text-xs h-5 px-2 border-0 truncate max-w-[150px] transition-smooth ${categoryStyles.badgeBg} ${categoryStyles.badgeText}`}
                  data-testid="badge-category"
                >
                  {category}
                </Badge>
                {isAnswered && (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 transition-smooth">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Solved</span>
                  </div>
                )}
                {isLiveVerified && (
                  <Badge variant="default" className="text-xs h-5 px-2 bg-green-600 transition-smooth">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
                {hasSetFile && (
                  <Badge variant="outline" className="text-xs h-5 px-2 transition-smooth">
                    <FileText className="h-3 w-3 mr-1" />
                    Set
                  </Badge>
                )}
                {hasBacktest && (
                  <Badge variant="outline" className="text-xs h-5 px-2 transition-smooth">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Test
                  </Badge>
                )}
                {coinsEarned > 0 && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 transition-smooth">
                    <Coins className="h-3.5 w-3.5" />
                    <span>+{coinsEarned}</span>
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold text-sm mb-1.5 line-clamp-2 leading-snug" data-testid="text-thread-title">
                {title}
              </h3>
              
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
                {excerpt}
              </p>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span data-testid="text-author" className="truncate max-w-[120px]">
                  {author?.name || 'Unknown User'}
                </span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{author?.reputation || 0}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate" suppressHydrationWarning>{timeAgo}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-1 pb-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5" data-testid="stat-replies">
              <MessageCircle className="h-3.5 w-3.5" />
              <span suppressHydrationWarning>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="stat-views">
              <Eye className="h-3.5 w-3.5" />
              <span suppressHydrationWarning>{formattedViews || viewCount} views</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
