import { ReactNode } from 'react';
import { headers } from "next/headers";
import { getInternalApiUrl } from "@/lib/api-config";
import { AuthUpdater } from '@/components/providers/AuthUpdater';
import type { User } from "../../../shared/schema";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  // Fetch auth state on server for authenticated routes
  // Skip during build - headers() will throw during static generation
  let initialUser: User | null = null;
  
  try {
    // headers() throws during static generation/build - this is our build detection
    const headersList = await headers();
    const cookie = headersList.get("cookie");
    
    // Only fetch if we have a cookie (actual request, not build)
    if (cookie) {
      const apiUrl = getInternalApiUrl();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(`${apiUrl}/api/me`, {
        headers: { cookie },
        cache: "no-store",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        initialUser = await res.json();
      }
    }
  } catch (error) {
    // During build/static generation, headers() will throw
    // Also catches any fetch errors - fail gracefully with null user
    // Client-side AuthUpdater will handle auth hydration
  }

  return (
    <AuthUpdater initialUser={initialUser}>
      {children}
    </AuthUpdater>
  );
}
