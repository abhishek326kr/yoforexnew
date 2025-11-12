import { ReactNode } from "react";
import { headers } from "next/headers";
import { getInternalApiUrl } from "@/lib/api-config";
import ClientProviders from "./ClientProviders";
import type { User } from "../../../shared/schema";

/**
 * Server component that fetches initial auth state and provides it to client components
 * This prevents hydration mismatches by ensuring consistent auth state between server and client
 */
export async function AppProviders({ children }: { children: ReactNode }) {
  // Fetch auth state on server with forwarded cookies
  let initialUser: User | null = null;
  
  try {
    const headersList = await headers();
    const cookie = headersList.get("cookie");
    
    const apiUrl = getInternalApiUrl();
    
    // Add timeout to prevent hanging in production
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const res = await fetch(`${apiUrl}/api/me`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.ok) {
      initialUser = await res.json();
      console.log("[AppProviders] Auth fetch successful");
    } else {
      console.log("[AppProviders] Auth fetch returned:", res.status);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("[AppProviders] Auth fetch timed out - continuing without initial user");
    } else {
      console.error("[AppProviders] Failed to fetch initial auth state:", error);
    }
    // Fail gracefully - initialUser stays null
  }

  return (
    <ClientProviders initialUser={initialUser}>
      {children}
    </ClientProviders>
  );
}
