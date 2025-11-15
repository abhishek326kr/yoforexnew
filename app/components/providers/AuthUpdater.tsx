"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { setUser } = useAuth();

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  return (
    <ErrorBoundary>
      <ActivityTracker />
      {children}
    </ErrorBoundary>
  );
}
