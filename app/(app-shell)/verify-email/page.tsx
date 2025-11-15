import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Force dynamic rendering - this page uses searchParams
export const dynamic = 'force-dynamic';

// Loading fallback for Suspense boundary
function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-2xl">Loading...</CardTitle>
          <CardDescription className="mt-2">
            Please wait while we prepare your verification
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Server Component - wraps client component with Suspense
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
