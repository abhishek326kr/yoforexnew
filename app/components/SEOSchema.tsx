import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateProductSchema,
  generateArticleSchema,
  generateDiscussionForumPostingSchema,
  generateFAQPageSchema,
  generateBreadcrumbSchema,
} from '../../lib/schema-generator';

interface SEOSchemaProps {
  type: 'Organization' | 'WebSite' | 'Product' | 'Article' | 'DiscussionForumPosting' | 'FAQPage' | 'BreadcrumbList';
  data: any;
}

export function SEOSchema({ type, data }: SEOSchemaProps) {
  let schema: any;
  
  switch (type) {
    case 'Organization':
      schema = generateOrganizationSchema(data);
      break;
    case 'WebSite':
      schema = generateWebSiteSchema(data);
      break;
    case 'Product':
      schema = generateProductSchema(data);
      break;
    case 'Article':
      schema = generateArticleSchema(data);
      break;
    case 'DiscussionForumPosting':
      schema = generateDiscussionForumPostingSchema(data);
      break;
    case 'FAQPage':
      schema = generateFAQPageSchema(data);
      break;
    case 'BreadcrumbList':
      schema = generateBreadcrumbSchema(data);
      break;
    default:
      schema = {};
  }
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}

// Organization Schema for YoForex
export function OrganizationSchema() {
  const schema = generateOrganizationSchema({
    name: "YoForex",
    url: "https://yoforex.net",
    logo: "https://yoforex.net/logo.png",
    description: "Leading Forex Trading Community & EA Marketplace. Expert Advisors, MT4/MT5 tools, trading strategies, and forex signals.",
    organizationId: "https://yoforex.net#organization",
    socialProfiles: [
      "https://twitter.com/yoforex",
      "https://facebook.com/yoforex",
      "https://youtube.com/yoforex"
    ],
    email: "support@yoforex.net"
  });
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}

// Website Search Schema
export function WebsiteSearchSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "url": "https://yoforex.net",
          "name": "YoForex",
          "description": "Expert Advisor Forum & EA Marketplace",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://yoforex.net/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        })
      }}
    />
  );
}

// Product Schema for EA/Robot
export function EAProductSchema({ ea }: { ea: any }) {
  const schema = generateProductSchema({
    product: {
      id: ea.id,
      title: ea.title,
      description: ea.description,
      slug: ea.slug || ea.id,
      type: 'ea' as any,
      status: 'approved' as any,
      isFree: ea.price === 0,
      priceCoins: ea.price || 0,
      images: ea.thumbnailUrl ? [{ url: ea.thumbnailUrl, isCover: true }] : [],
      category: ea.category
    } as any,
    baseUrl: "https://yoforex.net",
    author: {
      username: ea.vendorName || "YoForex",
      id: ea.vendorId || "1"
    } as any,
    averageRating: ea.averageRating,
    reviewCount: ea.reviewCount || 0
  });
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}

// FAQ Schema for FAQ pages
export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = generateFAQPageSchema({
    questions: faqs.map(faq => ({
      question: faq.question,
      answer: faq.answer
    })),
    baseUrl: "https://yoforex.net",
    pageUrl: typeof window !== 'undefined' ? window.location.href : "https://yoforex.net"
  });
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}

// Forum Discussion Schema
export function ForumThreadSchema({ thread }: { thread: any }) {
  const schema = generateDiscussionForumPostingSchema({
    thread: {
      id: thread.id,
      title: thread.title,
      body: thread.content,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      slug: thread.slug,
      replyCount: thread.replyCount || 0,
      views: thread.views || 0,
      likes: thread.likes || 0,
      tags: thread.tags || []
    } as any,
    baseUrl: "https://yoforex.net",
    author: thread.author || { username: thread.authorName, id: thread.authorId } as any,
    viewCount: thread.views,
    replyCount: thread.replyCount,
    upvoteCount: thread.likes,
    replies: thread.replies
  });
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}