"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  return (
    <Button 
      variant="outline" 
      size="lg"
      onClick={() => window.location.reload()}
      className="gap-2"
      data-testid="button-refresh"
    >
      <RefreshCw className="h-4 w-4" />
      Try Again
    </Button>
  );
}
