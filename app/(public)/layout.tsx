import { ReactNode } from 'react';

// Force all public pages to use dynamic rendering
// This prevents build-time static generation errors with client components
export const dynamic = 'force-dynamic';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return children; // Root layout handles html/body
}
