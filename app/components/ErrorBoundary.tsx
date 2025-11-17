'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error details
    this.setState({
      errorInfo,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
          <Card className="max-w-2xl w-full" data-testid="error-boundary-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred. You can reload the page to try again.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="font-mono text-sm">
                    <strong>Error:</strong> {this.state.error.message}
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold">
                          Component Stack
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReload}
                  className="flex-1"
                  data-testid="button-reload-page"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              {/* Alternative actions */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  You can also try these options:
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => typeof window !== 'undefined' && window.history.back()}
                    data-testid="button-go-back"
                  >
                    Go Back
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => typeof window !== 'undefined' && (window.location.href = '/')}
                    data-testid="button-go-home"
                  >
                    Go to Home
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={this.handleReset}
                    data-testid="button-try-again"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;