'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbSchema } from './StructuredData';

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({ items, showHome = true, className = '' }: BreadcrumbsProps) {
  // Prepare items for display
  const breadcrumbItems: BreadcrumbItem[] = showHome 
    ? [{ name: 'Home', url: '/' }, ...items]
    : items;

  // Prepare items for structured data (with full URLs)
  const schemaItems = breadcrumbItems.map(item => ({
    name: item.name,
    url: item.url ? `https://yoforex.net${item.url}` : undefined
  }));

  return (
    <>
      {/* Structured Data */}
      <BreadcrumbSchema items={schemaItems} />
      
      {/* Visual Breadcrumbs */}
      <nav 
        aria-label="Breadcrumb" 
        className={`flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 ${className}`}
        data-testid="breadcrumb-navigation"
      >
        <ol className="flex items-center space-x-2">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            
            return (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                )}
                
                {item.url && !isLast ? (
                  <Link 
                    href={item.url}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center"
                    data-testid={`breadcrumb-link-${index}`}
                  >
                    {index === 0 && showHome && (
                      <Home className="w-4 h-4 mr-1" />
                    )}
                    <span>{item.name}</span>
                  </Link>
                ) : (
                  <span 
                    className={isLast ? 'text-gray-900 dark:text-gray-100 font-medium' : ''}
                    aria-current={isLast ? 'page' : undefined}
                    data-testid={`breadcrumb-text-${index}`}
                  >
                    {index === 0 && showHome && !item.url && (
                      <Home className="w-4 h-4 mr-1 inline" />
                    )}
                    {item.name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

// Helper function to generate breadcrumbs from a path
export function generateBreadcrumbsFromPath(path: string): BreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    
    // Convert slug to readable name
    const name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbs.push({
      name,
      url: currentPath
    });
  }
  
  return breadcrumbs;
}

// Predefined breadcrumb configurations for common pages
export const BREADCRUMB_CONFIGS = {
  marketplace: [
    { name: 'Marketplace', url: '/marketplace' }
  ],
  
  marketplaceItem: (itemName: string) => [
    { name: 'Marketplace', url: '/marketplace' },
    { name: itemName }
  ],
  
  discussions: [
    { name: 'Discussions', url: '/discussions' }
  ],
  
  thread: (categoryName: string, threadTitle: string) => [
    { name: 'Discussions', url: '/discussions' },
    { name: categoryName, url: `/category/${categoryName.toLowerCase().replace(/\s+/g, '-')}` },
    { name: threadTitle }
  ],
  
  category: (categoryName: string) => [
    { name: 'Categories', url: '/categories' },
    { name: categoryName }
  ],
  
  userProfile: (username: string) => [
    { name: 'Members', url: '/members' },
    { name: username }
  ],
  
  brokers: [
    { name: 'Brokers', url: '/brokers' }
  ],
  
  broker: (brokerName: string) => [
    { name: 'Brokers', url: '/brokers' },
    { name: brokerName }
  ],
  
  guides: [
    { name: 'Guides', url: '/guides' }
  ],
  
  guide: (guideTitle: string) => [
    { name: 'Guides', url: '/guides' },
    { name: guideTitle }
  ],
  
  settings: [
    { name: 'Settings', url: '/settings' }
  ],
  
  dashboard: [
    { name: 'Dashboard', url: '/dashboard' }
  ],
  
  support: [
    { name: 'Support', url: '/support' }
  ]
};