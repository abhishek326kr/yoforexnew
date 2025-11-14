"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import EnhancedFooter from "@/components/EnhancedFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Download,
  Eye,
  Coins,
  Calendar,
  Share2,
  Star,
  User,
  CheckCircle,
  ArrowLeft,
  Package,
  TrendingUp,
  Award,
  Shield,
  Zap,
  ChevronRight,
  BarChart3,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { coinsToUSD } from "../../../shared/coinUtils";
import EADownloadCard from "./components/EADownloadCard";

interface EA {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  priceCoins: number;
  isFree: boolean;
  imageUrls?: string[];
  downloads?: number;
  views?: number;
  createdAt: string;
  creatorId: string;
  creatorUsername?: string;
  creatorProfileImageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  downloadPoints?: number;
}

interface EADetailClientProps {
  ea: EA;
  similarEAs: EA[];
}

export default function EADetailClient({ ea, similarEAs }: EADetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { requireAuth, AuthPrompt } = useAuthPrompt();

  // Fetch user coins
  const { data: coinsData } = useQuery<{ balance: number }>({
    queryKey: ["/api/sweets/balance/me"],
    enabled: !!user?.id,
  });

  const userCoins = coinsData?.balance ?? 0;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: ea.title,
          text: ea.description.substring(0, 100),
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "EA link copied to clipboard",
      });
    }
  };

  const images = ea.imageUrls && ea.imageUrls.length > 0 
    ? ea.imageUrls 
    : ["https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop"];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link href="/marketplace">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Left Sidebar - Discovery & Context - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:block lg:col-span-2 space-y-4">
              {/* Categories Navigation */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Browse Categories
                  </h3>
                  <div className="space-y-1">
                    {[
                      { name: "Trend Following", count: 45 },
                      { name: "Scalping", count: 32 },
                      { name: "Grid Trading", count: 28 },
                      { name: "Martingale", count: 15 },
                      { name: "News Trading", count: 12 }
                    ].map((cat) => (
                      <Link key={cat.name} href={`/marketplace?category=${encodeURIComponent(cat.name)}`}>
                        <button className="w-full text-left px-3 py-2 text-sm rounded-md hover-elevate active-elevate-2 flex items-center justify-between group">
                          <span className="flex items-center gap-2">
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {cat.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                        </button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trending EAs */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trending This Week
                  </h3>
                  <div className="space-y-3">
                    {similarEAs.slice(0, 3).map((item) => (
                      <Link key={item.id} href={`/ea/${item.slug}`}>
                        <div className="flex gap-2 p-2 rounded-md hover-elevate active-elevate-2 cursor-pointer">
                          <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                            <img
                              src={item.imageUrls?.[0] || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=100&fit=crop"}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-2 mb-1">{item.title}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Coins className="h-3 w-3" />
                              {item.priceCoins}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/marketplace?sort=trending">
                    <Button variant="ghost" size="sm" className="w-full mt-3">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Why Buy Here?
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Verified Sellers</p>
                        <p className="text-muted-foreground">All sellers are verified</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Secure Payments</p>
                        <p className="text-muted-foreground">Safe coin transactions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Instant Delivery</p>
                        <p className="text-muted-foreground">Download immediately</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-7 space-y-4 lg:space-y-6">
              {/* Header */}
              <Card>
                <CardContent className="p-4 lg:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge data-testid="badge-category" className="max-w-[200px] truncate text-xs sm:text-sm">{ea.category}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1 flex-shrink-0 text-xs">
                          <Calendar className="h-3 w-3" />
                          {new Date(ea.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 break-words" data-testid="heading-ea-title">
                        {ea.title}
                      </h1>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={ea.creatorProfileImageUrl} alt={ea.creatorUsername} />
                          <AvatarFallback>{ea.creatorUsername?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm sm:text-base" data-testid="text-seller-name">{ea.creatorUsername || "Unknown Seller"}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">EA Developer</p>
                        </div>
                      </div>
                    </div>
                    <div className="sm:text-right w-full sm:w-auto">
                      <Badge variant="default" className="text-lg sm:text-2xl px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto justify-center" data-testid="badge-price">
                        <Coins className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
                        {ea.priceCoins}
                      </Badge>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 text-center sm:text-right">
                        ~${coinsToUSD(ea.priceCoins).toFixed(2)} USD
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Download className="h-3 sm:h-4 w-3 sm:w-4" />
                      <span data-testid="text-downloads">{ea.downloads || 0} downloads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 sm:h-4 w-3 sm:w-4" />
                      <span data-testid="text-views">{ea.views || 0} views</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Gallery */}
              {images.length > 0 && (
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <Carousel className="w-full" data-testid="carousel-images">
                      <CarouselContent>
                        {images.map((img, index) => (
                          <CarouselItem key={index}>
                            <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
                              <img
                                src={img}
                                alt={`${ea.title} - Screenshot ${index + 1}`}
                                className="w-full h-full object-cover"
                                data-testid={`img-screenshot-${index}`}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {images.length > 1 && (
                        <>
                          <CarouselPrevious />
                          <CarouselNext />
                        </>
                      )}
                    </Carousel>
                    {images.length > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`h-2 w-2 rounded-full transition-colors ${
                              index === selectedImage ? 'bg-primary' : 'bg-muted-foreground/25'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4">About This EA</h2>
                  <div className="prose dark:prose-invert max-w-none text-sm sm:text-base">
                    <p className="whitespace-pre-wrap" data-testid="text-description">
                      {ea.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews Section */}
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4">Reviews & Ratings</h2>
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet. Be the first to review this EA!</p>
                  </div>
                </CardContent>
              </Card>

              {/* Similar EAs */}
              {similarEAs.length > 0 && (
                <Card>
                  <CardContent className="p-4 lg:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">You Might Also Like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                      {similarEAs.map((similarEA) => (
                        <Link key={similarEA.id} href={`/ea/${similarEA.slug}`}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`card-similar-${similarEA.id}`}>
                            <CardContent className="p-4">
                              <div className="flex gap-3">
                                <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                                  <img
                                    src={similarEA.imageUrls?.[0] || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=200&fit=crop"}
                                    alt={similarEA.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                                    {similarEA.title}
                                  </h3>
                                  <Badge variant="secondary" className="text-xs">
                                    <Coins className="h-3 w-3 mr-1" />
                                    {similarEA.priceCoins}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar - Download Section */}
            <div className="lg:col-span-3 space-y-4 lg:space-y-6">
              {/* Modern Download Card */}
              <EADownloadCard 
                ea={{
                  id: ea.id,
                  title: ea.title,
                  priceCoins: ea.priceCoins,
                  isFree: ea.isFree,
                  fileName: ea.fileName,
                  fileSize: ea.fileSize,
                  downloads: ea.downloads,
                  downloadPoints: ea.downloadPoints,
                  fileUrl: ea.fileUrl,
                }}
                userCoins={userCoins}
                isAuthenticated={isAuthenticated}
              />

              {/* Share Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShare}
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share This EA
              </Button>

              {/* Seller's Other EAs */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">About the Seller</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={ea.creatorProfileImageUrl} alt={ea.creatorUsername} />
                      <AvatarFallback>{ea.creatorUsername?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{ea.creatorUsername || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">EA Developer</p>
                    </div>
                  </div>
                  <Link href={`/user/${ea.creatorUsername}`}>
                    <Button variant="outline" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-lg font-bold mb-4">Quick Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground flex-shrink-0">Category:</span>
                      <span className="font-medium truncate text-right">{ea.category}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{ea.priceCoins} ₡</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Downloads:</span>
                      <span className="font-medium">{ea.downloads || 0}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Published:</span>
                      <span className="font-medium">
                        {new Date(ea.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <EnhancedFooter />
      <AuthPrompt />
    </>
  );
}
