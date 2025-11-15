import { Suspense } from 'react';
import AdminUsersContent from './AdminUsersContent';
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AdminUsersContent />
    </Suspense>
  );
}
