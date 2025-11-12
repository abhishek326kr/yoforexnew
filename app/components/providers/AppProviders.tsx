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
    const res = await fetch(`${apiUrl}/api/me`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    
    if (res.ok) {
      initialUser = await res.json();
    }
    // If 401 or other error, initialUser stays null (unauthenticated)
  } catch (error) {
    console.error("[AppProviders] Failed to fetch initial auth state:", error);
    // Fail gracefully - initialUser stays null
  }

  return (
    <ClientProviders initialUser={initialUser}>
      {children}
    </ClientProviders>
  );
}
