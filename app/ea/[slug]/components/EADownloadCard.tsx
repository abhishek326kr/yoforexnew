"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Coins,
  AlertCircle,
  FileArchive,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  Lock,
  FileText,
} from "lucide-react";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { coinsToUSD } from "../../../../shared/coinUtils";

interface EA {
  id: string;
  title: string;
  priceCoins: number;
  isFree: boolean;
  fileName?: string;
  fileSize?: number;
  downloads?: number;
  downloadPoints?: number;
  fileUrl?: string;
}

interface EADownloadCardProps {
  ea: EA;
  userCoins: number;
  isAuthenticated: boolean;
}

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Get file extension
const getFileExtension = (filename?: string) => {
  if (!filename) return "ZIP";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
};

export default function EADownloadCard({ ea, userCoins, isAuthenticated }: EADownloadCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { requireAuth, AuthPrompt } = useAuthPrompt();

  const hasEnoughCoins = userCoins >= ea.priceCoins;
  const fileName = ea.fileName || `${ea.title}.zip`;
  const fileSize = ea.fileSize || 0;
  const downloadCount = ea.downloads || 0;

  // Purchase/Download mutation
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/content/purchase/${ea.id}`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `${ea.title} downloaded successfully!`,
      });

      // Trigger file download
      const downloadUrl = data.downloadUrl || ea.fileUrl;
      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/sweets/balance/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download EA",
        variant: "destructive",
      });
    },
  });

  const handleDownload = () => {
    if (!isAuthenticated) {
      requireAuth(() => {});
      return;
    }

    // Check if this is a paid EA and user doesn't have enough coins
    if (!ea.isFree && !hasEnoughCoins) {
      toast({
        title: "Insufficient coins",
        description: `You need ${ea.priceCoins} coins but only have ${userCoins}`,
        variant: "destructive",
      });
      router.push("/recharge");
      return;
    }

    downloadMutation.mutate();
  };

  return (
    <>
      <Card className="overflow-hidden border-2 shadow-lg" data-testid="card-ea-download">
        <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {ea.isFree ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    FREE
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                    <Coins className="h-3 w-3 mr-1" />
                    {ea.priceCoins} Coins
                  </Badge>
                )}
                {downloadCount > 50 && (
                  <Badge variant="secondary" className="text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-bold mb-1">Get This EA</h3>
              <p className="text-sm text-muted-foreground">
                {ea.isFree
                  ? "Download instantly for free"
                  : `~$${coinsToUSD(ea.priceCoins).toFixed(2)} USD`}
              </p>
            </div>

            {isAuthenticated && (
              <div className="text-right bg-card rounded-lg px-4 py-3 border">
                <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
                <p className="text-xl font-bold flex items-center gap-1" data-testid="text-user-balance">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {userCoins.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* File Details Box */}
          <div className="bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl p-5 border-2 border-dashed space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <FileArchive className="h-7 w-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-semibold text-sm truncate" data-testid="text-filename">
                    {fileName}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs h-5">
                      {getFileExtension(fileName)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{formatFileSize(fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Download className="h-3 w-3" />
                    <span>{downloadCount.toLocaleString()} downloads</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing Info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-bold flex items-center gap-1">
                  {ea.isFree ? (
                    <span className="text-green-600 dark:text-green-400">FREE</span>
                  ) : (
                    <>
                      <Coins className="h-4 w-4 text-amber-500" />
                      {ea.priceCoins} Coins
                    </>
                  )}
                </span>
              </div>
              {ea.downloadPoints && ea.downloadPoints > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Download Points:</span>
                  <span className="font-semibold">{ea.downloadPoints} Points</span>
                </div>
              )}
            </div>
          </div>

          {/* Download Button */}
          {isAuthenticated ? (
            <>
              {hasEnoughCoins || ea.isFree ? (
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  onClick={handleDownload}
                  disabled={downloadMutation.isPending}
                  data-testid="button-download"
                >
                  {downloadMutation.isPending ? (
                    <>
                      <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      {ea.isFree ? "Download Free" : `Download for ${ea.priceCoins} Coins`}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                    onClick={() => router.push("/recharge")}
                    data-testid="button-recharge"
                  >
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Recharge Coins
                  </Button>
                  <p className="text-xs text-center text-destructive font-medium">
                    Need {ea.priceCoins - userCoins} more coins
                  </p>
                </div>
              )}
            </>
          ) : (
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
              size="lg"
              onClick={() => requireAuth(() => {})}
              data-testid="button-login-to-download"
            >
              <Lock className="h-5 w-5 mr-2" />
              Login to Download
            </Button>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t space-y-3">
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Instant download after purchase</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Secure payment & download</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <span>Lifetime access to file</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AuthPrompt />
    </>
  );
}
