"use client";

import Link from "next/link";
import { MessageSquare, FileText, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Category {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parentSlug?: string | null;
  threadCount: number;
  postCount: number;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  limit?: number;
}

const getCategoryIcon = (color: string) => {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center rounded-md overflow-hidden shadow-md">
      <div className={`absolute inset-0 ${color}`} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10" />
      <Folder className="w-5 h-5 text-white relative z-10" />
    </div>
  );
};

const getAnimationDelay = (index: number): string => {
  if (index === 0) return '';
  if (index === 1) return 'animate-delay-100';
  if (index === 2) return 'animate-delay-200';
  if (index === 3) return 'animate-delay-300';
  if (index === 4) return 'animate-delay-400';
  return 'animate-delay-500';
};

export function CategoryTree({ categories, limit }: CategoryTreeProps) {
  const mainCategories = categories.filter(c => !c.parentSlug);
  const displayCategories = limit ? mainCategories.slice(0, limit) : mainCategories;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="category-grid">
      {displayCategories.map((category, index) => {
        return (
          <Link 
            key={category.slug} 
            href={`/category/${category.slug}`}
            data-testid={`link-category-${category.slug}`}
            className={`animate-slide-up ${getAnimationDelay(index)}`}
          >
            <Card className="border-0 card-depth-1 hover-lift transition-smooth hover-elevate active-elevate-2 h-full" data-testid={`card-category-${category.slug}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getCategoryIcon(category.color)}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 leading-snug" data-testid={`text-category-name-${category.slug}`}>
                      {category.name}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5" data-testid={`stat-threads-${category.slug}`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{category.threadCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5" data-testid={`stat-posts-${category.slug}`}>
                        <FileText className="w-3.5 h-3.5" />
                        <span>{category.postCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
