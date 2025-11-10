"use client";

import Link from 'next/link';
import { Button } from './components/ui/button';
import { Home, Search, ArrowLeft, HelpCircle } from 'lucide-react';
import Header from './components/Header';
import { Footer } from './components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* 404 Animation */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400 animate-pulse">
              404
            </h1>
            <div className="mt-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <HelpCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or the URL might be incorrect.
          </p>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
            <Link 
              href="/" 
              className="flex items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid="404-home-link"
            >
              <Home className="w-5 h-5 mr-2" />
              Homepage
            </Link>
            <Link 
              href="/marketplace" 
              className="flex items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid="404-marketplace-link"
            >
              EA Marketplace
            </Link>
            <Link 
              href="/discussions" 
              className="flex items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid="404-discussions-link"
            >
              Forum Discussions
            </Link>
            <Link 
              href="/support" 
              className="flex items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid="404-support-link"
            >
              Get Help
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="inline-flex items-center"
              data-testid="404-back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Link href="/search">
              <Button className="inline-flex items-center" data-testid="404-search-button">
                <Search className="w-4 h-4 mr-2" />
                Search Site
              </Button>
            </Link>
          </div>

          {/* SEO-friendly suggestions */}
          <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Popular Pages You Might Be Looking For:
            </h3>
            <ul className="text-sm text-left space-y-2 max-w-md mx-auto">
              <li>
                <Link href="/best-forex-ea" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Best Forex EA 2025 - Top Rated Expert Advisors
                </Link>
              </li>
              <li>
                <Link href="/forex-signals" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Free Forex Signals - Daily Trading Alerts
                </Link>
              </li>
              <li>
                <Link href="/forex-trading-guide" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Complete Forex Trading Guide for Beginners
                </Link>
              </li>
              <li>
                <Link href="/brokers" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Forex Broker Reviews & Comparisons
                </Link>
              </li>
            </ul>
          </div>

          {/* Schema.org ErrorPage structured data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: '404 Error Page',
                description: 'Page not found error page for YoForex',
                url: 'https://yoforex.net/404',
                isPartOf: {
                  '@type': 'WebSite',
                  name: 'YoForex',
                  url: 'https://yoforex.net'
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: 'https://yoforex.net/search?q={search_term_string}',
                  'query-input': 'required name=search_term_string'
                }
              })
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}