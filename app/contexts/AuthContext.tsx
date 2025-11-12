"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "../../shared/schema";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  initialUser: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  // Use React Query for auth state with server-fetched initial data
  // This prevents hydration mismatches by ensuring consistent auth state
  const query = useQuery<User | null>({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
    initialData: initialUser ?? null,
    placeholderData: () => initialUser ?? null,
  });

  // Derive loading state from query status (never pending if initialData provided)
  const isLoading = query.status === "pending";
  const user = query.data;
  const isAuthenticated = user !== null && user !== undefined;

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      try {
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (fallbackError) {
        console.error("Fallback logout also failed:", fallbackError);
      }
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
