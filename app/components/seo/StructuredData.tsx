'use client';

import { useEffect } from 'react';

interface StructuredDataProps {
  data: Record<string, any>;
  type?: 'Organization' | 'WebSite' | 'Product' | 'Article' | 'BreadcrumbList' | 'Review' | 'FAQ' | 'Person' | 'LocalBusiness';
}

export function StructuredData({ data, type }: StructuredDataProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type || data['@type'],
    ...data,
  };

  useEffect(() => {
    // Create or update the JSON-LD script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(jsonLd);
    script.setAttribute('data-testid', 'structured-data');
    document.head.appendChild(script);

    return () => {
      // Clean up the script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}

// Organization Schema Helper
export function OrganizationSchema() {
  const organizationData = {
    '@type': 'Organization',
    name: 'YoForex',
    url: 'https://yoforex.net',
    logo: 'https://yoforex.net/og-image.svg',
    sameAs: [
      'https://twitter.com/YoForex',
      'https://facebook.com/YoForex',
      'https://linkedin.com/company/yoforex'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-0123',
      contactType: 'customer service',
      areaServed: 'Worldwide',
      availableLanguage: ['English']
    },
    description: 'Leading forex trading community and Expert Advisor marketplace for MT4/MT5 traders.'
  };

  return <StructuredData data={organizationData} type="Organization" />;
}

// WebSite Schema with Search Box
export function WebSiteSchema() {
  const websiteData = {
    '@type': 'WebSite',
    name: 'YoForex',
    url: 'https://yoforex.net',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://yoforex.net/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };

  return <StructuredData data={websiteData} type="WebSite" />;
}

// Product Schema for EAs
export function ProductSchema({
  name,
  description,
  price,
  currency = 'USD',
  image,
  rating,
  reviewCount,
  seller,
  category,
  sku
}: {
  name: string;
  description: string;
  price: number | string;
  currency?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  seller?: string;
  category?: string;
  sku?: string;
}) {
  const productData: any = {
    '@type': 'Product',
    name,
    description,
    image: image || 'https://yoforex.net/og-image.svg',
    sku: sku || `EA-${Date.now()}`,
    category: category || 'Expert Advisor',
    offers: {
      '@type': 'Offer',
      price: typeof price === 'number' ? price.toFixed(2) : price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: seller || 'YoForex Marketplace'
      }
    }
  };

  if (rating && reviewCount) {
    productData['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: rating.toString(),
      reviewCount: reviewCount.toString()
    };
  }

  return <StructuredData data={productData} type="Product" />;
}

// Article Schema for Forum Threads
export function ArticleSchema({
  title,
  description,
  author,
  datePublished,
  dateModified,
  image,
  url,
  keywords
}: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
  keywords?: string[];
}) {
  const articleData: any = {
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: author
    },
    datePublished,
    dateModified: dateModified || datePublished,
    image: image || 'https://yoforex.net/og-image.svg',
    url,
    publisher: {
      '@type': 'Organization',
      name: 'YoForex',
      logo: {
        '@type': 'ImageObject',
        url: 'https://yoforex.net/og-image.svg'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    }
  };

  if (keywords && keywords.length > 0) {
    articleData['keywords'] = keywords.join(', ');
  }

  return <StructuredData data={articleData} type="Article" />;
}

// BreadcrumbList Schema
export function BreadcrumbSchema({
  items
}: {
  items: Array<{ name: string; url?: string }>;
}) {
  const breadcrumbData = {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url || undefined
    }))
  };

  return <StructuredData data={breadcrumbData} type="BreadcrumbList" />;
}

// Review Schema
export function ReviewSchema({
  itemName,
  reviewRating,
  author,
  datePublished,
  reviewBody
}: {
  itemName: string;
  reviewRating: number;
  author: string;
  datePublished: string;
  reviewBody: string;
}) {
  const reviewData = {
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: itemName
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: reviewRating.toString(),
      bestRating: '5',
      worstRating: '1'
    },
    author: {
      '@type': 'Person',
      name: author
    },
    datePublished,
    reviewBody
  };

  return <StructuredData data={reviewData} type="Review" />;
}

// FAQ Schema
export function FAQSchema({
  questions
}: {
  questions: Array<{ question: string; answer: string }>;
}) {
  const faqData = {
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer
      }
    }))
  };

  return <StructuredData data={faqData} />;
}

// Person Schema for User Profiles
export function PersonSchema({
  name,
  image,
  url,
  description,
  jobTitle
}: {
  name: string;
  image?: string;
  url: string;
  description?: string;
  jobTitle?: string;
}) {
  const personData = {
    '@type': 'Person',
    name,
    image: image || 'https://yoforex.net/og-image.svg',
    url,
    description: description || `${name} is a member of the YoForex trading community.`,
    jobTitle: jobTitle || 'Forex Trader',
    memberOf: {
      '@type': 'Organization',
      name: 'YoForex'
    }
  };

  return <StructuredData data={personData} type="Person" />;
}