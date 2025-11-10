"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Filter,
  Grid3x3,
  List,
  SlidersHorizontal,
  Star,
  Download,
  Eye,
  ShoppingCart,
  Heart,
  MoreVertical,
  TrendingUp,
  Package,
  Zap,
  AlertCircle,
  ChevronRight,
  Plus,
  ArrowUpDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Import default category images - use relative imports for stock images
const defaultEAImage = "/api/static/stock_images/automated_trading_ro_0d991591.jpg";
const scalpingImage = "/api/static/stock_images/scalping_trading_fas_de4e64b2.jpg";
const gridImage = "/api/static/stock_images/grid_trading_strateg_e3a4c62f.jpg";
const newsImage = "/api/static/stock_images/news_trading_economi_3f79be44.jpg";
const trendImage = "/api/static/stock_images/trend_following_trad_25625633.jpg";
const martingaleImage = "/api/static/stock_images/martingale_strategy__f6497cd3.jpg";
const chartImage = "/api/static/stock_images/forex_trading_chart__fd545134.jpg";
const indicatorImage = "/api/static/stock_images/forex_trading_chart__749ccb1f.jpg";
const templateImage = "/api/static/stock_images/forex_trading_chart__24fe7cca.jpg";

interface Content {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'ea' | 'indicator' | 'article' | 'source_code';
  category: string;
  priceCoins: number;
  isFree: boolean;
  imageUrls?: string[];
  postLogoUrl?: string;
  rating?: number;
  reviewCount?: number;
  downloads: number;
  views: number;
  authorId: string;
  authorName?: string;
  createdAt: string;
  platform?: string;
  version?: string;
  tags?: string[];
}

export interface InitialFilters {
  search?: string;
  category?: string;
  type?: string;
  sort?: string;
  price?: string;
  platform?: string;
}

interface MarketplaceEnhancedProps {
  initialContent: Content[];
  initialFilters?: InitialFilters;
}

const CATEGORIES = [
  { value: "all", label: "All Categories", icon: Package },
  { value: "Scalping", label: "Scalping", icon: Zap },
  { value: "Trend Following", label: "Trend Following", icon: TrendingUp },
  { value: "Grid", label: "Grid Trading", icon: Grid3x3 },
  { value: "News", label: "News Trading", icon: AlertCircle },
  { value: "Martingale", label: "Martingale", icon: ArrowUpDown },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "most_popular", label: "Most Popular" },
  { value: "best_rated", label: "Best Rated" },
  { value: "most_downloaded", label: "Most Downloaded" },
];

// Category-based default images mapping
const CATEGORY_IMAGES: Record<string, string> = {
  // EA categories
  "scalping": scalpingImage,
  "scalping-eas": scalpingImage,
  "grid": gridImage,
  "grid-trading": gridImage,
  "grid-trading-eas": gridImage,
  "news": newsImage,
  "news-trading": newsImage,
  "news-trading-eas": newsImage,
  "trend following": trendImage,
  "trend-following": trendImage,
  "trend-following-eas": trendImage,
  "martingale": martingaleImage,
  "martingale-eas": martingaleImage,
  "cryptocurrency": chartImage,
  
  // Indicator categories
  "technical analysis": indicatorImage,
  "oscillators-momentum": indicatorImage,
  "sr-tools": indicatorImage,
  "volume-indicators": indicatorImage,
  "dashboard": chartImage,
  
  // Template categories
  "template-packs": templateImage,
  
  // Default fallbacks by type
  "_ea_default": defaultEAImage,
  "_indicator_default": indicatorImage,
  "_template_default": templateImage,
  "_article_default": chartImage,
};

// Helper function to get category image
const getCategoryImage = (category: string, type: string): string => {
  // Try exact category match (case insensitive)
  const lowerCategory = category.toLowerCase();
  if (CATEGORY_IMAGES[lowerCategory]) {
    return CATEGORY_IMAGES[lowerCategory];
  }
  
  // Try type-based default
  const typeDefault = `_${type}_default`;
  if (CATEGORY_IMAGES[typeDefault]) {
    return CATEGORY_IMAGES[typeDefault];
  }
  
  // Final fallback
  return defaultEAImage;
};

export default function MarketplaceEnhanced({ initialContent, initialFilters = {} }: MarketplaceEnhancedProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // State management - Initialize from server-provided filters
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || "");
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || "all");
  const [selectedType, setSelectedType] = useState(initialFilters.type || "all");
  const [sortBy, setSortBy] = useState(initialFilters.sort || "newest");
  const [priceFilter, setPriceFilter] = useState(initialFilters.price || "all");
  const [platformFilter, setPlatformFilter] = useState(initialFilters.platform || "all");
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Sync state when initialFilters prop changes (server navigation)
  useEffect(() => {
    if (initialFilters.search !== undefined) setSearchTerm(initialFilters.search);
    if (initialFilters.category !== undefined) setSelectedCategory(initialFilters.category);
    if (initialFilters.type !== undefined) setSelectedType(initialFilters.type);
    if (initialFilters.sort !== undefined) setSortBy(initialFilters.sort);
    if (initialFilters.price !== undefined) setPriceFilter(initialFilters.price);
    if (initialFilters.platform !== undefined) setPlatformFilter(initialFilters.platform);
  }, [initialFilters]);
  
  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedType !== 'all') params.set('type', selectedType);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (priceFilter !== 'all') params.set('price', priceFilter);
    if (platformFilter !== 'all') params.set('platform', platformFilter);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/marketplace';
    
    router.replace(newUrl, { scroll: false });
  }, [searchTerm, selectedCategory, selectedType, sortBy, priceFilter, platformFilter, router]);
  
  // Fetch content with filters
  const { data: content = initialContent, isLoading, refetch } = useQuery<Content[]>({
    queryKey: ['/api/content', { 
      status: 'approved',
      type: selectedType !== 'all' ? selectedType : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: searchTerm || undefined,
      sort: sortBy,
      price: priceFilter !== 'all' ? priceFilter : undefined,
      platform: platformFilter !== 'all' ? platformFilter : undefined,
    }],
    initialData: initialContent,
  });
  
  // Filter and sort content
  const filteredContent = useMemo(() => {
    let filtered = [...(content || [])];
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(item => item.type === selectedType);
    }
    
    // Apply price filter
    if (priceFilter === "free") {
      filtered = filtered.filter(item => item.isFree);
    } else if (priceFilter === "premium") {
      filtered = filtered.filter(item => !item.isFree);
    } else if (priceFilter === "under100") {
      filtered = filtered.filter(item => item.priceCoins < 100);
    } else if (priceFilter === "100to500") {
      filtered = filtered.filter(item => item.priceCoins >= 100 && item.priceCoins <= 500);
    } else if (priceFilter === "over500") {
      filtered = filtered.filter(item => item.priceCoins > 500);
    }
    
    // Apply platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter(item => item.platform === platformFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "price_low":
          return a.priceCoins - b.priceCoins;
        case "price_high":
          return b.priceCoins - a.priceCoins;
        case "most_popular":
          return b.views - a.views;
        case "best_rated":
          return (b.rating || 0) - (a.rating || 0);
        case "most_downloaded":
          return b.downloads - a.downloads;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [content, searchTerm, selectedCategory, selectedType, sortBy, priceFilter, platformFilter]);
  
  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedType !== "all") params.set("type", selectedType);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (priceFilter !== "all") params.set("price", priceFilter);
    if (platformFilter !== "all") params.set("platform", platformFilter);
    
    const queryString = params.toString();
    router.push(`/marketplace${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [searchTerm, selectedCategory, selectedType, sortBy, priceFilter, platformFilter, router]);
  
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
        toast({ description: "Removed from favorites" });
      } else {
        newFavorites.add(id);
        toast({ description: "Added to favorites" });
      }
      return newFavorites;
    });
  };
  
  const handlePurchase = (item: Content) => {
    toast({
      title: "Purchase",
      description: `Ready to purchase "${item.title}" for ${item.priceCoins} coins`,
      action: (
        <Button size="sm" onClick={() => router.push(`/ea/${item.slug}`)}>
          View Details
        </Button>
      ),
    });
  };
  
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedType("all");
    setSortBy("newest");
    setPriceFilter("all");
    setPlatformFilter("all");
  };
  
  const hasActiveFilters = searchTerm || selectedCategory !== "all" || 
    selectedType !== "all" || sortBy !== "newest" || 
    priceFilter !== "all" || platformFilter !== "all";
  
  // Product Card Component
  const ProductCard = ({ item }: { item: Content }) => {
    // Use category-appropriate default image if no custom image is provided
    const imageUrl = item.imageUrls?.[0] || item.postLogoUrl || getCategoryImage(item.category, item.type);
    
    if (viewMode === "list") {
      return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div className="flex">
              <div className="w-48 h-36 relative bg-gradient-to-br from-blue-100 to-purple-100">
                <img
                  src={imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getCategoryImage(item.category, item.type);
                  }}
                />
                {item.isFree && (
                  <Badge className="absolute top-2 left-2 bg-green-500">FREE</Badge>
                )}
              </div>
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">
                      <Link href={`/ea/${item.slug}`} className="hover:text-blue-600">
                        {item.title}
                      </Link>
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{item.type.toUpperCase()}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                      {item.platform && <Badge variant="outline">{item.platform}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(item.id)}
                    >
                      <Heart className={cn("h-4 w-4", favorites.has(item.id) && "fill-red-500 text-red-500")} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/ea/${item.slug}`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem>Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {item.description.replace(/<[^>]*>/g, '')}
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {item.rating?.toFixed(1) || '0.0'} ({item.reviewCount || 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {item.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.views}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!item.isFree && (
                      <span className="text-lg font-bold text-amber-600">
                        {item.priceCoins} coins
                      </span>
                    )}
                    <Button 
                      size="sm"
                      onClick={() => handlePurchase(item)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {item.isFree ? 'Download' : 'Purchase'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100">
            <img
              src={imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = getCategoryImage(item.category, item.type);
              }}
            />
            {item.isFree && (
              <Badge className="absolute top-2 left-2 bg-green-500">FREE</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
              onClick={() => toggleFavorite(item.id)}
            >
              <Heart className={cn("h-4 w-4", favorites.has(item.id) && "fill-red-500 text-red-500")} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {item.type.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {item.category}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            <Link href={`/ea/${item.slug}`} className="hover:text-blue-600">
              {item.title}
            </Link>
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {item.description.replace(/<[^>]*>/g, '')}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {item.rating?.toFixed(1) || '0.0'}
            </span>
            <span>•</span>
            <span>{item.downloads} downloads</span>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <div className="flex justify-between items-center w-full">
            <div className="text-lg font-bold text-amber-600">
              {item.isFree ? 'Free' : `${item.priceCoins} coins`}
            </div>
            <Button
              size="sm"
              onClick={() => handlePurchase(item)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              {item.isFree ? 'Get' : 'Buy'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">EA & Indicator Marketplace</h1>
            <p className="text-muted-foreground">
              Discover professional trading tools for MT4/MT5
            </p>
          </div>
          
          <Link href="/publish">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Sell Your EA
            </Button>
          </Link>
        </div>
        
        {/* Search and View Toggle */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search EAs, indicators, or articles..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
          
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Filters Section */}
      {showFilters && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ea">Expert Advisors</SelectItem>
                  <SelectItem value="indicator">Indicators</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="source_code">Source Code</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="under100">Under 100 coins</SelectItem>
                  <SelectItem value="100to500">100-500 coins</SelectItem>
                  <SelectItem value="over500">Over 500 coins</SelectItem>
                  <SelectItem value="premium">Premium Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="MT4">MetaTrader 4</SelectItem>
                  <SelectItem value="MT5">MetaTrader 5</SelectItem>
                  <SelectItem value="Both">MT4 & MT5</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
      
      {/* Results Summary */}
      {(searchTerm || hasActiveFilters) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Found {filteredContent.length} {filteredContent.length === 1 ? 'product' : 'products'}
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        </div>
      )}
      
      {/* Content Grid/List */}
      {isLoading ? (
        <div className={cn(
          "grid gap-6",
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : filteredContent.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No results for "${searchTerm}". Try different keywords.`
                  : 'Adjust your filters to see more products.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}>
          {filteredContent.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}