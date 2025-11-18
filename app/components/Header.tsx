"use client";

import { Search, Menu, User, MessageSquare, Coins, LogIn, LogOut, Lightbulb, HelpCircle, TrendingUp, Settings, Code, Award, BookOpen, Activity, Wrench, FileCode, GraduationCap, MessageCircle as MessageCircleIcon, Trophy, BarChart3, Rocket, ShieldAlert, Plus, LayoutDashboard, Gift, Package, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import CoinBalanceWidget from "./CoinBalanceWidget";
import OnboardingRewardsModal from "./OnboardingRewardsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "./NotificationBell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { coinsToUSD } from "../../shared/coinUtils";
import { useDebounce } from "@/hooks/use-debounce";

// Category data for Release EA dropdown
const publishCategories = [
  { slug: "strategy-discussion", name: "Strategy Discussion", icon: Lightbulb, hint: "Share trading strategies and setups" },
  { slug: "beginner-questions", name: "Beginner Questions", icon: HelpCircle, hint: "Start here for basic questions" },
  { slug: "performance-reports", name: "Performance Reports", icon: TrendingUp, hint: "Backtest & live test results" },
  { slug: "technical-support", name: "Technical Support", icon: Settings, hint: "Installation & VPS help" },
  { slug: "ea-development", name: "EA Development", icon: Code, hint: "MQL4/MQL5 coding help" },
  { slug: "success-stories", name: "Success Stories", icon: Award, hint: "Trading wins & lessons" },
  { slug: "ea-library", name: "EA Library", icon: BookOpen, hint: "Upload your EAs here" },
  { slug: "indicators", name: "Indicators", icon: Activity, hint: "Share custom indicators" },
  { slug: "tools-utilities", name: "Tools & Utilities", icon: Wrench, hint: "Trading tools & panels" },
  { slug: "source-code", name: "Source Code", icon: FileCode, hint: "Open source EA/indicator code" },
  { slug: "learning-hub", name: "Learning Hub", icon: GraduationCap, hint: "Guides & courses" },
  { slug: "qa-help", name: "Q&A / Help", icon: MessageCircleIcon, hint: "Quick answers" },
  { slug: "bounties", name: "Bounties", icon: Trophy, hint: "Offer rewards for help" },
  { slug: "rankings", name: "Rankings", icon: BarChart3, hint: "Top EAs & contributors" },
  { slug: "commercial-trials", name: "Commercial Trials", icon: Rocket, hint: "Vendor demos & trials" },
  { slug: "scam-watch", name: "Scam Watch", icon: ShieldAlert, hint: "Report scams & fraud" },
];

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [isMounted, setIsMounted] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { user, isLoading: isAuthLoading, isAuthenticated, logout } = useAuth();
  const { requireAuth, AuthPrompt } = useAuthPrompt();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const { data: coinsData } = useQuery<{ totalCoins: number; weeklyEarned: number; rank: number | null }>({
    queryKey: ["/api/user", user?.id, "coins"],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const res = await fetch(`/api/user/${user.id}/coins`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch coins');
      return res.json();
    },
    enabled: !!user?.id && (isProfileDropdownOpen || mobileMenuOpen),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: !!user?.id,
  });

  const unreadCount = unreadData?.count ?? 0;

  const userCoins = coinsData?.totalCoins ?? 0;
  const userCoinsUSD = coinsToUSD(userCoins);

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Fetch search suggestions
  useQuery({
    queryKey: ["/api/search/suggestions", debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSearchSuggestions([]);
        return [];
      }
      
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedSearchQuery)}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      setSearchSuggestions(data.suggestions || []);
      return data.suggestions || [];
    },
    enabled: debouncedSearchQuery.length >= 2,
  });
  
  // Handle search submission
  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    if (searchTerm && searchTerm.trim()) {
      router.push(`/search?q=${searchTerm.trim()}`);
      setShowSuggestions(false);
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (selectedSuggestion >= 0 && searchSuggestions[selectedSuggestion]) {
        handleSearch(searchSuggestions[selectedSuggestion]);
      } else {
        handleSearch();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion(prev => 
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      searchInputRef.current?.blur();
    }
  };
  
  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Reset selected suggestion when suggestions change
  useEffect(() => {
    setSelectedSuggestion(-1);
  }, [searchSuggestions]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" suppressHydrationWarning>
      <div className="container flex h-16 items-center justify-between gap-4 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 cursor-pointer" data-testid="link-home">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg hidden sm:inline">YoForex</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" suppressHydrationWarning>
            <Link href="/categories">
              <Button 
                variant={isMounted && pathname === "/categories" ? "default" : "ghost"} 
                size="sm" 
                data-testid="button-categories"
                aria-current={isMounted && pathname === "/categories" ? "page" : undefined}
              >
                Categories
              </Button>
            </Link>
            <Link href="/discussions">
              <Button 
                variant={isMounted && pathname === "/discussions" ? "default" : "ghost"} 
                size="sm" 
                data-testid="button-discussions"
                aria-current={isMounted && pathname === "/discussions" ? "page" : undefined}
              >
                Discussions
              </Button>
            </Link>
            
            <Link href="/brokers">
              <Button 
                variant={isMounted && pathname === "/brokers" ? "default" : "ghost"} 
                size="sm" 
                data-testid="button-broker-reviews"
                aria-current={isMounted && pathname === "/brokers" ? "page" : undefined}
              >
                Broker Reviews
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button 
                variant={isMounted && pathname === "/marketplace" ? "default" : "ghost"} 
                size="sm" 
                data-testid="button-marketplace"
                aria-current={isMounted && pathname === "/marketplace" ? "page" : undefined}
              >
                Marketplace
              </Button>
            </Link>
            <Link href="/marketplace/publish">
              <Button 
                variant={isMounted && (pathname === "/marketplace/publish" || pathname === "/publish-ea" || pathname?.startsWith("/publish-ea/") || pathname?.startsWith("/ea/")) ? "default" : "ghost"} 
                size="sm" 
                data-testid="button-publish-ea"
                aria-current={isMounted && (pathname === "/marketplace/publish" || pathname === "/publish-ea" || pathname?.startsWith("/publish-ea/")) ? "page" : undefined}
              >
                Publish EA
              </Button>
            </Link>
            <Link href="/members">
              <Button 
                variant={isMounted && pathname === "/members" ? "default" : "ghost"} 
                size="sm" 
                data-testid="button-members"
                aria-current={isMounted && pathname === "/members" ? "page" : undefined}
              >
                Members
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search threads, members, EAs..."
              className="pl-9 pr-4"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(e.target.value.length >= 2);
              }}
              onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              data-testid="input-search"
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-50">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={`w-full text-left px-4 py-2 hover:bg-accent ${
                      index === selectedSuggestion ? 'bg-accent' : ''
                    }`}
                    onClick={() => handleSearch(suggestion)}
                    data-testid={`search-suggestion-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </button>
                ))}
                <div className="px-4 py-2 border-t">
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => handleSearch()}
                    data-testid="button-search-all"
                  >
                    Search for "{searchQuery}"
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              {/* Show "Create Thread" button for authenticated users */}
              <Link href="/discussions/new">
                <Button size="sm" className="hidden sm:flex bg-primary hover:bg-primary/90" data-testid="button-create-thread">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Thread
                </Button>
              </Link>
              
              {/* Coin Balance Widget */}
              <CoinBalanceWidget />
              
              <Link href="/messages">
                <Button variant="ghost" size="icon" data-testid="button-messages">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
              
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="hidden md:flex relative" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs" data-testid="badge-unread-count">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </>
          )}
          
          {isAuthLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.username} />
                    <AvatarFallback>{(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel data-testid="text-user-name">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username}
                </DropdownMenuLabel>
                <div className="px-2 py-3 border-b">
                  <Link href="/recharge">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-yellow-500" />
                        <span className="font-semibold">{userCoins.toLocaleString()}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">${userCoinsUSD.toFixed(2)} USD</span>
                    </div>
                  </Link>
                </div>
                <DropdownMenuSeparator />
                <Link href="/dashboard">
                  <DropdownMenuItem data-testid="link-dashboard">
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                </Link>
                <Link href="/rewards">
                  <DropdownMenuItem data-testid="link-rewards">
                    <Gift className="mr-2 h-4 w-4" />
                    Rewards Catalog
                  </DropdownMenuItem>
                </Link>
                <Link href="/my-redemptions">
                  <DropdownMenuItem data-testid="link-my-redemptions">
                    <Package className="mr-2 h-4 w-4" />
                    My Redemptions
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/settings">
                  <DropdownMenuItem data-testid="link-customize-dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Customize Dashboard
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem data-testid="link-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => requireAuth(() => {})} data-testid="button-login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
          
          <ThemeToggle />
          
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* User Profile Section */}
                {isAuthenticated && user && (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.username} />
                        <AvatarFallback>{(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.username}
                        </p>
                      </div>
                    </div>
                    
                    <Link href="/recharge" onClick={() => setMobileMenuOpen(false)}>
                      <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-yellow-500" />
                          <span className="font-semibold">{userCoins.toLocaleString()} coins</span>
                        </div>
                        <span className="text-sm text-muted-foreground">${userCoinsUSD.toFixed(2)} USD</span>
                      </div>
                    </Link>
                    
                    <Separator />
                  </>
                )}

                {/* Navigation Links */}
                <nav className="flex flex-col gap-2">
                  {/* Create Thread Button for Mobile */}
                  {isAuthenticated && (
                    <Link href="/discussions/new" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 mb-2"
                        data-testid="mobile-button-create-thread"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Thread
                      </Button>
                    </Link>
                  )}
                  
                  <Link href="/categories" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={pathname === "/categories" ? "default" : "ghost"} 
                      className="w-full justify-start"
                      data-testid="mobile-link-categories"
                    >
                      Categories
                    </Button>
                  </Link>
                  <Link href="/discussions" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={pathname === "/discussions" ? "default" : "ghost"} 
                      className="w-full justify-start"
                      data-testid="mobile-link-discussions"
                    >
                      Discussions
                    </Button>
                  </Link>
                  <Link href="/brokers" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={pathname === "/brokers" ? "default" : "ghost"} 
                      className="w-full justify-start"
                      data-testid="mobile-link-brokers"
                    >
                      Broker Reviews
                    </Button>
                  </Link>
                  <Link href="/marketplace" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={pathname === "/marketplace" ? "default" : "ghost"} 
                      className="w-full justify-start"
                      data-testid="mobile-link-marketplace"
                    >
                      Marketplace
                    </Button>
                  </Link>
                  <Link href="/publish-ea/new" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={pathname === "/publish-ea" || pathname?.startsWith("/publish-ea/") || pathname?.startsWith("/ea/") ? "default" : "ghost"} 
                      className="w-full justify-start"
                      data-testid="mobile-link-publish-ea"
                    >
                      Publish EA
                    </Button>
                  </Link>
                  <Link href="/members" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={pathname === "/members" ? "default" : "ghost"} 
                      className="w-full justify-start"
                      data-testid="mobile-link-members"
                    >
                      Members
                    </Button>
                  </Link>
                </nav>

                {isAuthenticated && (
                  <>
                    <Separator />
                    {/* User Menu Items */}
                    <nav className="flex flex-col gap-2">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" data-testid="mobile-link-dashboard">
                          <User className="mr-2 h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" data-testid="mobile-link-messages">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Messages
                        </Button>
                      </Link>
                      <Link href="/notifications" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start relative" data-testid="mobile-link-notifications">
                          <Bell className="mr-2 h-4 w-4" />
                          Notifications
                          {unreadCount > 0 && (
                            <Badge className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs" data-testid="mobile-badge-unread-count">
                              {unreadCount}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                      <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" data-testid="mobile-link-settings">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                    </nav>
                    <Separator />
                    <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { logout(); setMobileMenuOpen(false); }} data-testid="mobile-button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                )}

                {!isAuthenticated && !isAuthLoading && (
                  <>
                    <Separator />
                    <Button onClick={() => requireAuth(() => { setMobileMenuOpen(false); })} data-testid="mobile-button-login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <AuthPrompt />
      <OnboardingRewardsModal />
    </header>
  );
}
