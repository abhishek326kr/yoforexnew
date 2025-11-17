"use client";

import { ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ActivityTracker } from "@/components/ActivityTracker";
import type { User } from "../../../shared/schema";

interface AuthUpdaterProps {
  children: ReactNode;
  initialUser: User | null;
}

/**
 * Client component that updates the auth context with server-fetched user
 * Used in authenticated routes to provide initial auth state
 */
export function AuthUpdater({ children, initialUser }: AuthUpdaterProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialUser) {
      // Update React Query cache directly since AuthContext doesn't expose setUser
      queryClient.setQueryData(["/api/me"], initialUser);
    }
  }, [initialUser, queryClient]);

  return (
    <ErrorBoundary>
      <ActivityTracker />
      {children}
    </ErrorBoundary>
  );
}
