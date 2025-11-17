"use client";

import { ReactNode, useEffect, useRef } from "react";
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
  const hasSetInitialUser = useRef(false);

  useEffect(() => {
    // Only set initial user once to avoid infinite loops
    // The server component may re-render and pass new object references
    // even if the user data is the same
    if (initialUser && !hasSetInitialUser.current) {
      queryClient.setQueryData(["/api/me"], initialUser);
      hasSetInitialUser.current = true;
    }
  }, [initialUser, queryClient]);

  return (
    <ErrorBoundary>
      <ActivityTracker />
      {children}
    </ErrorBoundary>
  );
}
