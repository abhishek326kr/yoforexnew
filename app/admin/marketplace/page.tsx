import { Suspense } from 'react';
import AdminMarketplaceContent from './AdminMarketplaceContent';
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminMarketplacePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AdminMarketplaceContent />
    </Suspense>
  );
}
