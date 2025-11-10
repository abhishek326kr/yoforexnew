"use client";

import Header from "@/components/Header";
import EnhancedFooter from "@/components/EnhancedFooter";
import MarketplaceEnhanced from "./MarketplaceEnhanced";

interface Content {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  category: string;
  priceCoins: number;
  isFree: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  postLogoUrl?: string;
  likes?: number;
  downloads?: number;
  views?: number;
  createdAt: string;
}

interface MarketplaceClientProps {
  initialContent: Content[];
}

export default function MarketplaceClient({ initialContent }: MarketplaceClientProps) {
  // Use the enhanced marketplace component for better functionality
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <MarketplaceEnhanced initialContent={initialContent} />
      </main>
      <EnhancedFooter />
    </div>
  );
}