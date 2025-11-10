# YoForex SEO Guidelines

## Table of Contents
1. [Meta Tags Best Practices](#meta-tags-best-practices)
2. [Structured Data Implementation](#structured-data-implementation)
3. [Page-Specific SEO Requirements](#page-specific-seo-requirements)
4. [Performance Optimization](#performance-optimization)
5. [Social Media SEO](#social-media-seo)
6. [Technical SEO Checklist](#technical-seo-checklist)
7. [Testing & Validation](#testing--validation)
8. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

## Meta Tags Best Practices

### Title Tags
- **Length**: 50-60 characters (max 60)
- **Format**: `Primary Keyword - Secondary Keyword | YoForex`
- **Uniqueness**: Every page MUST have a unique title
- **Keywords**: Include primary keyword near the beginning

#### Examples:
```typescript
// Good
"Best Forex EA 2025 - Top MT4/MT5 Expert Advisors | YoForex"

// Bad
"YoForex - Best Website for Trading" // Too generic
```

### Meta Descriptions
- **Length**: 150-160 characters (max 160)
- **Content**: Compelling, action-oriented, includes keywords
- **CTR Focus**: Write to encourage clicks from search results
- **Uniqueness**: Never duplicate descriptions across pages

#### Examples:
```typescript
// Good
"Discover the best Forex EA robots for MT4 and MT5 in 2025. Compare top-rated Expert Advisors, read reviews, and find profitable automated trading systems."

// Bad
"Welcome to our forex website." // Too short and vague
```

### Keywords Meta Tag
While not used by Google, still valuable for internal SEO tracking:
```typescript
keywords: ['forex', 'EA', 'expert advisor', 'MT4', 'MT5', 'trading robot']
```

## Structured Data Implementation

### Required Schema Types by Page

#### Homepage
```typescript
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData';

// In your page component
<>
  <OrganizationSchema />
  <WebSiteSchema />
</>
```

#### Product/EA Pages
```typescript
import { ProductSchema, BreadcrumbSchema } from '@/components/seo/StructuredData';

<ProductSchema
  name={ea.title}
  description={ea.description}
  price={ea.price}
  rating={ea.rating}
  reviewCount={ea.reviewCount}
  seller={ea.vendorName}
  category="Expert Advisor"
  sku={ea.id}
/>
```

#### Forum Thread Pages
```typescript
import { ArticleSchema, BreadcrumbSchema } from '@/components/seo/StructuredData';

<ArticleSchema
  title={thread.title}
  description={thread.excerpt}
  author={thread.authorName}
  datePublished={thread.createdAt}
  dateModified={thread.updatedAt}
  url={`/thread/${thread.slug}`}
  keywords={thread.tags}
/>
```

#### User Profile Pages
```typescript
import { PersonSchema } from '@/components/seo/StructuredData';

<PersonSchema
  name={user.displayName}
  image={user.avatarUrl}
  url={`/user/${user.username}`}
  description={user.bio}
  jobTitle="Forex Trader"
/>
```

## Page-Specific SEO Requirements

### Dynamic Pages (generateMetadata)
For pages with dynamic content, use `generateMetadata`:

```typescript
import { generateThreadMetadata } from '@/lib/seo-metadata';

export async function generateMetadata({ params }) {
  const thread = await fetchThread(params.slug);
  return generateThreadMetadata(thread);
}
```

### Static Pages
For static pages, export const metadata:

```typescript
import { PAGE_METADATA } from '@/components/seo/MetaTags';

export const metadata = PAGE_METADATA.marketplace();
```

### Pagination SEO
For paginated content:
```typescript
import { generatePaginatedMetadata } from '@/lib/seo-metadata';

export async function generateMetadata({ searchParams }) {
  const page = searchParams.page || 1;
  return generatePaginatedMetadata(
    'Forum Discussions',
    'Browse the latest forex trading discussions',
    page,
    totalPages,
    '/discussions'
  );
}
```

## Performance Optimization

### Image Optimization
1. **Use Next.js Image Component**:
```jsx
import Image from 'next/image';

<Image
  src="/ea-screenshot.jpg"
  alt="EA Trading Results Dashboard"
  width={800}
  height={450}
  loading="lazy"
  placeholder="blur"
/>
```

2. **Lazy Loading for Below-Fold Images**:
```jsx
loading="lazy"
```

3. **WebP Format**: Automatically handled by Next.js Image

### Core Web Vitals Optimization

#### Largest Contentful Paint (LCP)
- Preload critical images
- Optimize server response time
- Use CDN for static assets

#### First Input Delay (FID)
- Code splitting with dynamic imports
- Minimize JavaScript execution time
- Use web workers for heavy computations

#### Cumulative Layout Shift (CLS)
- Set explicit dimensions for images and videos
- Reserve space for dynamic content
- Avoid inserting content above existing content

### Bundle Size Optimization
```javascript
// Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

## Social Media SEO

### Open Graph Tags
Every page should have:
```typescript
openGraph: {
  title: 'Page Title',
  description: 'Page description',
  url: 'https://yoforex.net/page-url',
  siteName: 'YoForex',
  images: [{
    url: 'https://yoforex.net/og-image.jpg',
    width: 1200,
    height: 630,
    alt: 'Description of image'
  }],
  type: 'website'
}
```

### Twitter Cards
```typescript
twitter: {
  card: 'summary_large_image',
  title: 'Page Title',
  description: 'Page description',
  site: '@YoForex',
  creator: '@author',
  images: ['https://yoforex.net/twitter-image.jpg']
}
```

### Social Share Component Usage
```jsx
import { SocialShare } from '@/components/seo/SocialShare';

<SocialShare
  url={currentUrl}
  title={pageTitle}
  description={pageDescription}
  hashtags={['forex', 'trading', 'EA']}
/>
```

## Technical SEO Checklist

### Every Page Must Have:
- [ ] Unique title tag (50-60 chars)
- [ ] Unique meta description (150-160 chars)
- [ ] Canonical URL
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Structured data (where applicable)
- [ ] Mobile viewport meta tag
- [ ] Lang attribute

### Site-Wide Requirements:
- [ ] XML Sitemap (app/sitemap.ts)
- [ ] Robots.txt (app/robots.ts)
- [ ] 404 Error Page (app/not-found.tsx)
- [ ] Favicon set (all sizes)
- [ ] SSL Certificate
- [ ] Mobile-responsive design
- [ ] Fast loading time (<3 seconds)

## Testing & Validation

### 1. Run SEO Audit Test
```bash
npm test tests/seo/seo-audit.test.ts
```

### 2. Google Rich Results Test
- Visit: https://search.google.com/test/rich-results
- Test each page type (homepage, product, article, etc.)

### 3. PageSpeed Insights
- Visit: https://pagespeed.web.dev/
- Test both mobile and desktop
- Target: >90 score for all metrics

### 4. Schema Validator
- Visit: https://validator.schema.org/
- Paste your JSON-LD and validate

### 5. Social Media Preview Tools
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/

### 6. Mobile-Friendly Test
- Visit: https://search.google.com/test/mobile-friendly
- Test key pages

## Common Mistakes to Avoid

### 1. Duplicate Content
- Never copy meta descriptions between pages
- Use canonical tags for similar content
- Implement proper pagination with rel="prev" and rel="next"

### 2. Missing Alt Text
```jsx
// Bad
<img src="chart.png" />

// Good
<img src="chart.png" alt="EUR/USD daily chart showing bullish trend" />
```

### 3. Broken Internal Links
- Regularly audit internal links
- Use proper Link components
- Implement 301 redirects for moved content

### 4. Ignoring Search Intent
- Match content to user search intent
- Use appropriate schema type
- Focus on user value, not keyword stuffing

### 5. Poor URL Structure
```
// Bad
/page?id=123&cat=ea&type=mt4

// Good
/ea/gold-scalper-pro-mt4
```

### 6. Missing Breadcrumbs
Always implement breadcrumb navigation with schema:
```jsx
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

<Breadcrumbs items={[
  { name: 'Home', url: '/' },
  { name: 'Marketplace', url: '/marketplace' },
  { name: productName }
]} />
```

## SEO Implementation Examples

### Complete Page Example
```typescript
import { Metadata } from 'next';
import { 
  ProductSchema, 
  BreadcrumbSchema, 
  FAQSchema 
} from '@/components/seo/StructuredData';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SocialShare } from '@/components/seo/SocialShare';

export const metadata: Metadata = {
  title: 'Gold Scalper Pro - Best MT4 EA for XAUUSD | YoForex',
  description: 'Gold Scalper Pro EA for MT4. Automated gold trading with 85% win rate. Download now with verified backtest results.',
  keywords: ['gold ea', 'xauusd ea', 'mt4 gold scalper', 'forex robot'],
  openGraph: {
    title: 'Gold Scalper Pro - Best MT4 EA for XAUUSD',
    description: 'Automated gold trading EA with 85% win rate',
    images: ['/images/gold-scalper-pro.jpg'],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gold Scalper Pro EA',
    description: 'Best MT4 EA for gold trading'
  },
  alternates: {
    canonical: 'https://yoforex.net/ea/gold-scalper-pro'
  }
};

export default function EAPage({ ea }) {
  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { name: 'Marketplace', url: '/marketplace' },
        { name: 'Expert Advisors', url: '/marketplace/ea' },
        { name: ea.title }
      ]} />

      {/* Structured Data */}
      <ProductSchema {...ea} />
      <FAQSchema questions={ea.faqs} />

      {/* Page Content */}
      <h1>{ea.title}</h1>
      
      {/* Social Share */}
      <SocialShare 
        title={ea.title}
        description={ea.description}
      />
    </>
  );
}
```

## Monitoring & Maintenance

### Weekly Tasks
- Check Google Search Console for errors
- Monitor Core Web Vitals
- Review top performing pages
- Check for broken links

### Monthly Tasks
- Update sitemap if needed
- Review and update meta descriptions
- Analyze search queries and optimize content
- Check structured data validity

### Quarterly Tasks
- Comprehensive SEO audit
- Competitor analysis
- Update keyword research
- Content gap analysis

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Next.js SEO Guide](https://nextjs.org/learn/seo/introduction-to-seo)
- [Web.dev Performance](https://web.dev/performance/)
- [Open Graph Protocol](https://ogp.me/)

## Support

For SEO-related questions or issues:
1. Run the SEO audit test first
2. Check this documentation
3. Validate with external tools
4. Contact the development team if issues persist

Remember: Good SEO is about providing value to users while making content discoverable and understandable to search engines.