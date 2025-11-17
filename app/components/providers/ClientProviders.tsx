"use client";

import { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ActivityTracker } from "@/components/ActivityTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { User } from "../../../shared/schema";

interface ClientProvidersProps {
  children: ReactNode;
  initialUser: User | null;
}

export default function ClientProviders({ children, initialUser }: ClientProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider initialUser={initialUser}>
              <ActivityTracker />
              {children}
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
