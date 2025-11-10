"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, MessageSquare, Package, TrendingUp, Loader2, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  id: string;
  type: "thread" | "user" | "content" | "broker";
  title?: string;
  username?: string;
  name?: string;
  description?: string;
  slug?: string;
  category?: string;
  author?: string;
  replies?: number;
  likes?: number;
  price?: number;
  rating?: number;
  createdAt?: string;
  url: string;
  highlight?: string;
}

interface SearchResponse {
  query: string;
  results: {
    threads: SearchResult[];
    users: SearchResult[];
    marketplace: SearchResult[];
    brokers: SearchResult[];
  };
  total: number;
  suggestions: string[];
}

interface SearchClientProps {
  initialQuery: {
    q?: string;
    type?: string;
    sort?: string;
  };
}

export default function SearchClient({ initialQuery }: SearchClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery.q || "");
  const [selectedType, setSelectedType] = useState(initialQuery.type || "all");
  const [sortBy, setSortBy] = useState(initialQuery.sort || "relevance");
  const debouncedQuery = useDebounce(query, 300);

  // Update URL when search parameters change
  useEffect(() => {
    if (debouncedQuery || selectedType !== "all" || sortBy !== "relevance") {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (selectedType !== "all") params.set("type", selectedType);
      if (sortBy !== "relevance") params.set("sort", sortBy);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    } else {
      router.replace("/search", { scroll: false });
    }
  }, [debouncedQuery, selectedType, sortBy, router]);

  // Fetch search results
  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/search", debouncedQuery, selectedType, sortBy],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return {
          query: debouncedQuery,
          results: { threads: [], users: [], marketplace: [], brokers: [] },
          total: 0,
          suggestions: []
        };
      }
      
      const params = new URLSearchParams();
      params.set("q", debouncedQuery);
      if (selectedType !== "all") params.set("type", selectedType);
      params.set("sort", sortBy);
      
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleClearSearch = () => {
    setQuery("");
    router.replace("/search", { scroll: false });
  };

  const renderSearchResult = (result: SearchResult) => {
    const IconComponent = 
      result.type === "thread" ? MessageSquare :
      result.type === "user" ? Users :
      result.type === "content" ? Package :
      TrendingUp;

    return (
      <Link href={result.url} key={result.id}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  {result.type === "thread" ? "Forum" :
                   result.type === "user" ? "Member" :
                   result.type === "content" ? "Marketplace" :
                   "Broker"}
                </Badge>
              </div>
              {result.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm">{result.rating.toFixed(1)}</span>
                </div>
              )}
              {result.price !== undefined && (
                <Badge variant="secondary">{result.price === 0 ? "Free" : `${result.price} coins`}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg mb-2">
              {result.title || result.name || result.username}
            </CardTitle>
            {result.description && (
              <CardDescription className="line-clamp-2">
                {result.highlight ? (
                  <span dangerouslySetInnerHTML={{ __html: result.highlight }} />
                ) : (
                  result.description
                )}
              </CardDescription>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              {result.author && (
                <span>by {result.author}</span>
              )}
              {result.category && (
                <Badge variant="outline" className="text-xs">{result.category}</Badge>
              )}
              {result.replies !== undefined && (
                <span>{result.replies} replies</span>
              )}
              {result.likes !== undefined && (
                <span>{result.likes} likes</span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const allResults = data ? [
    ...data.results.threads,
    ...data.results.users,
    ...data.results.marketplace,
    ...data.results.brokers,
  ] : [];

  const filteredResults = selectedType === "all" ? allResults :
    selectedType === "threads" ? data?.results.threads || [] :
    selectedType === "users" ? data?.results.users || [] :
    selectedType === "marketplace" ? data?.results.marketplace || [] :
    selectedType === "brokers" ? data?.results.brokers || [] :
    [];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search YoForex</h1>
        
        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for threads, members, EAs, brokers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-search-main"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={handleClearSearch}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[150px]" data-testid="select-search-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="threads">Forum Threads</SelectItem>
              <SelectItem value="users">Members</SelectItem>
              <SelectItem value="marketplace">Marketplace</SelectItem>
              <SelectItem value="brokers">Brokers</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Options */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="popularity">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Suggestions */}
      {data?.suggestions && data.suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {data.suggestions.map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">An error occurred while searching.</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      ) : query.length < 2 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Start searching</p>
            <p className="text-muted-foreground">
              Enter at least 2 characters to search across forums, members, marketplace, and brokers.
            </p>
          </CardContent>
        </Card>
      ) : filteredResults.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-muted-foreground">
              Try different keywords or adjust your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Found {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} 
            {query && ` for "${query}"`}
          </p>
          <div className="space-y-2">
            {filteredResults.map(renderSearchResult)}
          </div>
        </div>
      )}
    </div>
  );
}
