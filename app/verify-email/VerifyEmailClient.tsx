'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link - no token provided');
      return;
    }

    // Verify email with backend
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || data.error || 'Verification failed');
        }
      })
      .catch((error) => {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Network error - please try again later');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'verifying' && (
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          
          <CardDescription className="mt-2">
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email has been successfully verified'}
            {status === 'error' && 'We could not verify your email address'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-left text-sm text-green-900 dark:text-green-100">
                  <p className="font-medium mb-1">Welcome to YoForex!</p>
                  <p className="text-green-700 dark:text-green-300">
                    You now have full access to all features including the marketplace, forums, and earning coins.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-900 dark:text-red-100">
                The verification link may have expired or is invalid. Please try registering again or contact support.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          {status === 'success' && (
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/dashboard'}
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
          )}
          
          {status === 'error' && (
            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => window.location.href = '/'}
              data-testid="button-go-home"
            >
              Return to Home
            </Button>
          )}
          
          {(status === 'success' || status === 'error') && (
            <Button 
              variant="ghost"
              className="w-full" 
              onClick={() => window.location.href = '/earn'}
              data-testid="button-explore"
            >
              {status === 'success' ? 'Start Earning Coins' : 'Explore YoForex'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
