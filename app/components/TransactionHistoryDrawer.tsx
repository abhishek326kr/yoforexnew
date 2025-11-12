"use client";

import { useState } from "react";
import { Plus, Minus, Clock, Calendar, Filter, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistance } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  type: "earn" | "spend" | "expired";
  amount: number;
  description: string;
  createdAt: string;
  metadata?: any;
}

interface TransactionHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

export default function TransactionHistoryDrawer({
  open,
  onOpenChange,
}: TransactionHistoryDrawerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("30d");

  const { data: transactionsData, isLoading } = useQuery<{
    transactions: Transaction[];
    total: number;
  }>({
    queryKey: ["/api/sweets/transactions/me", activeTab, dateRange],
    queryFn: async () => {
      // Build URL with query parameters
      const params = new URLSearchParams();
      if (activeTab && activeTab !== 'all') {
        params.set('type', activeTab);
      }
      if (dateRange) {
        params.set('dateRange', dateRange);
      }
      
      const url = `/api/sweets/transactions/me?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      
      return await res.json();
    },
    enabled: !!user && open,
  });

  const transactions = transactionsData?.transactions ?? [];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earn":
        return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "spend":
        return <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case "expired":
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "earn":
        return "text-green-600 dark:text-green-400";
      case "spend":
        return "text-red-600 dark:text-red-400";
      case "expired":
        return "text-orange-600 dark:text-orange-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getAmountPrefix = (type: string) => {
    return type === "earn" ? "+" : "-";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[500px] p-0 dark:bg-gray-900 dark:border-gray-800"
        data-testid="drawer-transaction-history"
      >
        <SheetHeader className="p-6 pb-4 border-b dark:border-gray-800">
          <SheetTitle className="dark:text-white">Transaction History</SheetTitle>
          <SheetDescription className="dark:text-gray-400">
            View all your coin transactions
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {DATE_RANGES.map((range) => (
                  <SelectItem
                    key={range.value}
                    value={range.value}
                    className="dark:text-gray-200 dark:focus:bg-gray-700"
                  >
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4 dark:bg-gray-800">
              <TabsTrigger
                value="all"
                data-testid="tab-all"
                className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300 dark:data-[state=active]:text-white"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="earn"
                data-testid="tab-earned"
                className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300 dark:data-[state=active]:text-white"
              >
                Earned
              </TabsTrigger>
              <TabsTrigger
                value="spend"
                data-testid="tab-spent"
                className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300 dark:data-[state=active]:text-white"
              >
                Spent
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                data-testid="tab-expired"
                className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300 dark:data-[state=active]:text-white"
              >
                Expired
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0 flex-1">
            <ScrollArea className="h-[calc(100vh-280px)] px-6">
              {isLoading ? (
                <div className="space-y-4 py-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full dark:bg-gray-800" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-200 mb-2">
                    No transactions yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start earning coins by participating in the community!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 p-4 rounded-md hover-elevate border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
                      data-testid={`transaction-row-${transaction.id}`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'earn' 
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : transaction.type === 'spend'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-orange-100 dark:bg-orange-900/30'
                        }`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDistance(new Date(transaction.createdAt), new Date(), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${
                          transaction.type === 'earn'
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : transaction.type === 'spend'
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                        }`}>
                          <Coins className={`h-4 w-4 ${getTransactionColor(transaction.type)}`} />
                          <span
                            className={`text-base font-bold ${getTransactionColor(
                              transaction.type
                            )}`}
                          >
                            {getAmountPrefix(transaction.type)}
                            {Math.abs(transaction.amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
