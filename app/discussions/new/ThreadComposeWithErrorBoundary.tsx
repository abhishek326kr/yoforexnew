"use client";

import React, { Component, ReactNode } from 'react';
import type { ForumCategory } from "@shared/schema";
import EnhancedThreadComposeClient from "./EnhancedThreadComposeClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ThreadCompose Error Boundary] Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container max-w-4xl mx-auto px-4 py-8">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Error Loading Thread Composer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  The thread creation form encountered an error and could not load properly.
                </p>
                <div className="bg-muted p-4 rounded-md mb-4">
                  <p className="text-sm font-mono">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                  {this.state.error?.stack && (
                    <pre className="text-xs mt-2 overflow-x-auto">
                      {this.state.error.stack.split('\n').slice(1, 5).join('\n')}
                    </pre>
                  )}
                </div>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  data-testid="button-reload"
                >
                  Reload Page
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ThreadComposeWithErrorBoundaryProps {
  categories: ForumCategory[];
}

export default function ThreadComposeWithErrorBoundary({ categories }: ThreadComposeWithErrorBoundaryProps) {
  console.log('[ThreadComposeWithErrorBoundary] Rendering with categories:', categories?.length || 0);
  
  return (

      <EnhancedThreadComposeClient categories={categories} />
  );
}