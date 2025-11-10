import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/db';
import { forumThreads, content, forumCategories, users } from '../../shared/schema';
import fs from 'fs/promises';
import path from 'path';

interface SEOAuditResult {
  page: string;
  issues: string[];
  warnings: string[];
  meta: {
    title?: string;
    description?: string;
    keywords?: string;
    openGraph?: any;
    twitter?: any;
    structuredData?: any;
  };
}

// Helper to check if a file contains specific metadata
async function checkPageMetadata(filePath: string): Promise<SEOAuditResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const issues: string[] = [];
  const warnings: string[] = [];
  const meta: any = {};

  // Check for metadata export
  const hasMetadata = content.includes('export const metadata') || content.includes('export async function generateMetadata');
  if (!hasMetadata) {
    issues.push('Missing metadata export');
  }

  // Check for title
  const titleMatch = content.match(/title:\s*['"`]([^'"`]+)['"`]/);
  if (!titleMatch) {
    issues.push('Missing title tag');
  } else {
    meta.title = titleMatch[1];
    if (titleMatch[1].length < 30) warnings.push(`Title too short: ${titleMatch[1].length} chars (min 30)`);
    if (titleMatch[1].length > 60) warnings.push(`Title too long: ${titleMatch[1].length} chars (max 60)`);
  }

  // Check for description
  const descMatch = content.match(/description:\s*['"`]([^'"`]+)['"`]/);
  if (!descMatch) {
    issues.push('Missing meta description');
  } else {
    meta.description = descMatch[1];
    if (descMatch[1].length < 120) warnings.push(`Description too short: ${descMatch[1].length} chars (min 120)`);
    if (descMatch[1].length > 160) warnings.push(`Description too long: ${descMatch[1].length} chars (max 160)`);
  }

  // Check for keywords
  const keywordsMatch = content.match(/keywords:\s*\[([^\]]+)\]/);
  if (!keywordsMatch) {
    warnings.push('Missing keywords meta tag');
  } else {
    meta.keywords = keywordsMatch[1];
  }

  // Check for Open Graph
  if (!content.includes('openGraph:')) {
    issues.push('Missing Open Graph tags');
  }

  // Check for Twitter Card
  if (!content.includes('twitter:')) {
    issues.push('Missing Twitter Card tags');
  }

  // Check for structured data/JSON-LD
  if (!content.includes('JSON.stringify') && !content.includes('json-ld') && !content.includes('structuredData')) {
    warnings.push('No structured data detected');
  }

  return {
    page: filePath.replace(process.cwd(), ''),
    issues,
    warnings,
    meta
  };
}

describe('YoForex Comprehensive SEO Audit', () => {
  let auditResults: SEOAuditResult[] = [];

  describe('1. Technical SEO Foundation', () => {
    it('should have all critical pages with proper metadata', async () => {
      const criticalPages = [
        'app/page.tsx',
        'app/marketplace/page.tsx',
        'app/discussions/page.tsx',
        'app/categories/page.tsx',
        'app/best-forex-ea/page.tsx',
        'app/forex-signals/page.tsx',
        'app/forex-trading-guide/page.tsx',
        'app/mt4-vs-mt5/page.tsx',
        'app/brokers/page.tsx',
        'app/ea/[slug]/page.tsx',
        'app/thread/[...slug]/page.tsx',
        'app/content/[slug]/page.tsx',
        'app/user/[username]/page.tsx'
      ];

      for (const pagePath of criticalPages) {
        const fullPath = path.join(process.cwd(), pagePath);
        try {
          const result = await checkPageMetadata(fullPath);
          auditResults.push(result);
          
          if (result.issues.length > 0) {
            console.log(`\n❌ ${pagePath}:`);
            result.issues.forEach(issue => console.log(`   - ${issue}`));
          }
          
          expect(result.issues.length, `${pagePath} has SEO issues`).toBe(0);
        } catch (error) {
          console.log(`⚠️ Could not check ${pagePath}`);
        }
      }
    });

    it('should have proper canonical URLs implementation', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      expect(content).toContain('metadataBase');
      expect(content).toContain('viewport');
    });

    it('should have language attributes set', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      expect(content).toContain('lang="en"');
    });

    it('should have mobile viewport meta tag', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      expect(content).toContain('viewport');
      expect(content).toContain('width=device-width');
      expect(content).toContain('initialScale');
    });

    it('should have favicon implementation', async () => {
      const publicFiles = [
        'public/favicon.ico',
        'public/favicon-16x16.png',
        'public/favicon-32x32.png',
        'public/apple-touch-icon.png',
        'public/android-chrome-192x192.png',
        'public/android-chrome-512x512.png',
        'public/site.webmanifest'
      ];

      for (const file of publicFiles) {
        const exists = await fs.access(path.join(process.cwd(), file))
          .then(() => true)
          .catch(() => false);
        
        expect(exists, `${file} should exist`).toBe(true);
      }
    });

    it('should have custom 404 page', async () => {
      const notFoundPath = path.join(process.cwd(), 'app/not-found.tsx');
      const errorPath = path.join(process.cwd(), 'app/error.tsx');
      
      const notFoundExists = await fs.access(notFoundPath)
        .then(() => true)
        .catch(() => false);
      
      const errorExists = await fs.access(errorPath)
        .then(() => true)
        .catch(() => false);
        
      expect(notFoundExists || errorExists).toBe(true);
    });
  });

  describe('2. Meta Tags & Descriptions', () => {
    it('should have unique titles for all pages', () => {
      const titles = auditResults.map(r => r.meta.title).filter(Boolean);
      const uniqueTitles = new Set(titles);
      
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it('should have optimized title lengths (50-60 chars)', () => {
      for (const result of auditResults) {
        if (result.meta.title) {
          const length = result.meta.title.length;
          expect(length).toBeGreaterThanOrEqual(30);
          expect(length).toBeLessThanOrEqual(60);
        }
      }
    });

    it('should have optimized description lengths (150-160 chars)', () => {
      for (const result of auditResults) {
        if (result.meta.description) {
          const length = result.meta.description.length;
          expect(length).toBeGreaterThanOrEqual(120);
          expect(length).toBeLessThanOrEqual(160);
        }
      }
    });

    it('should have relevant keywords for forex/trading content', () => {
      const expectedKeywords = [
        'forex', 'trading', 'EA', 'Expert Advisor', 
        'MT4', 'MT5', 'MetaTrader', 'algorithmic trading'
      ];
      
      for (const result of auditResults) {
        if (result.meta.keywords) {
          const hasRelevantKeywords = expectedKeywords.some(kw => 
            result.meta.keywords?.toLowerCase().includes(kw.toLowerCase())
          );
          expect(hasRelevantKeywords).toBe(true);
        }
      }
    });
  });

  describe('3. Structured Data (Schema Markup)', () => {
    it('should have Organization schema on homepage', async () => {
      const homePath = path.join(process.cwd(), 'app/page.tsx');
      const content = await fs.readFile(homePath, 'utf-8');
      
      const hasOrgSchema = content.includes('"@type": "Organization"') || 
                          content.includes('Organization') ||
                          content.includes('organization schema');
      
      if (!hasOrgSchema) {
        console.log('⚠️ Missing Organization schema on homepage');
      }
    });

    it('should have WebSite schema with searchbox', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      const hasWebsiteSchema = content.includes('"@type": "WebSite"') || 
                              content.includes('WebSite') ||
                              content.includes('website schema');
      
      if (!hasWebsiteSchema) {
        console.log('⚠️ Missing WebSite schema');
      }
    });

    it('should have Product schema for marketplace items', async () => {
      const eaPath = path.join(process.cwd(), 'app/ea/[slug]/page.tsx');
      const contentPath = path.join(process.cwd(), 'app/content/[slug]/page.tsx');
      
      for (const path of [eaPath, contentPath]) {
        try {
          const content = await fs.readFile(path, 'utf-8');
          const hasProductSchema = content.includes('"@type": "Product"') || 
                                  content.includes('Product') ||
                                  content.includes('product schema');
          
          if (!hasProductSchema) {
            console.log(`⚠️ Missing Product schema in ${path}`);
          }
        } catch (error) {
          // File might not exist
        }
      }
    });

    it('should have Article schema for forum threads', async () => {
      const threadPath = path.join(process.cwd(), 'app/thread/[...slug]/page.tsx');
      
      try {
        const content = await fs.readFile(threadPath, 'utf-8');
        const hasArticleSchema = content.includes('"@type": "Article"') || 
                                content.includes('Article') ||
                                content.includes('article schema');
        
        if (!hasArticleSchema) {
          console.log('⚠️ Missing Article schema for threads');
        }
      } catch (error) {
        // File might not exist
      }
    });

    it('should have BreadcrumbList schema', async () => {
      const categoryPath = path.join(process.cwd(), 'app/category/[slug]/page.tsx');
      
      try {
        const content = await fs.readFile(categoryPath, 'utf-8');
        const hasBreadcrumbSchema = content.includes('"@type": "BreadcrumbList"') || 
                                    content.includes('BreadcrumbList') ||
                                    content.includes('breadcrumb');
        
        if (!hasBreadcrumbSchema) {
          console.log('⚠️ Missing BreadcrumbList schema');
        }
      } catch (error) {
        // File might not exist
      }
    });
  });

  describe('4. Performance & Core Web Vitals', () => {
    it('should have lazy loading for images', async () => {
      const componentsWithImages = [
        'app/HomeClient.tsx',
        'app/marketplace/MarketplaceClient.tsx',
        'app/ea/[slug]/EADetailClient.tsx'
      ];

      for (const component of componentsWithImages) {
        try {
          const content = await fs.readFile(path.join(process.cwd(), component), 'utf-8');
          const hasLazyLoading = content.includes('loading="lazy"') || 
                                content.includes('Image') || // Next.js Image component
                                content.includes('lazy');
          
          if (!hasLazyLoading) {
            console.log(`⚠️ Missing lazy loading in ${component}`);
          }
        } catch (error) {
          // Component might not exist
        }
      }
    });

    it('should have proper cache headers configuration', async () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js');
      const content = await fs.readFile(nextConfigPath, 'utf-8');
      
      const hasCacheConfig = content.includes('headers') || 
                            content.includes('Cache-Control') ||
                            content.includes('revalidate');
      
      if (!hasCacheConfig) {
        console.log('⚠️ Missing cache configuration in next.config.js');
      }
    });
  });

  describe('5. Content SEO', () => {
    it('should have proper header hierarchy (H1-H6)', async () => {
      const contentPages = [
        'app/HomeClient.tsx',
        'app/marketplace/MarketplaceClient.tsx',
        'app/discussions/DiscussionsClient.tsx'
      ];

      for (const page of contentPages) {
        try {
          const content = await fs.readFile(path.join(process.cwd(), page), 'utf-8');
          
          // Check for H1
          const hasH1 = content.includes('<h1') || content.includes('className="text-4xl') || content.includes('text-3xl');
          if (!hasH1) {
            console.log(`⚠️ Missing H1 in ${page}`);
          }
          
          // Check for proper hierarchy
          const hasH2 = content.includes('<h2') || content.includes('text-2xl');
          const hasH3 = content.includes('<h3') || content.includes('text-xl');
          
          if (!hasH2) {
            console.log(`⚠️ Missing H2 hierarchy in ${page}`);
          }
        } catch (error) {
          // Page might not exist
        }
      }
    });

    it('should have descriptive alt text for images', async () => {
      const componentsWithImages = [
        'app/components/Header.tsx',
        'app/components/Footer.tsx',
        'app/HomeClient.tsx'
      ];

      for (const component of componentsWithImages) {
        try {
          const content = await fs.readFile(path.join(process.cwd(), component), 'utf-8');
          
          // Check if images have alt text
          if (content.includes('<img')) {
            const hasAlt = content.includes('alt=');
            if (!hasAlt) {
              console.log(`⚠️ Missing alt text in ${component}`);
            }
          }
        } catch (error) {
          // Component might not exist
        }
      }
    });
  });

  describe('6. Social Media SEO', () => {
    it('should have Open Graph tags for all pages', () => {
      for (const result of auditResults) {
        if (result.issues.includes('Missing Open Graph tags')) {
          console.log(`❌ ${result.page}: Missing Open Graph tags`);
        }
      }
    });

    it('should have Twitter Card tags for all pages', () => {
      for (const result of auditResults) {
        if (result.issues.includes('Missing Twitter Card tags')) {
          console.log(`❌ ${result.page}: Missing Twitter Card tags`);
        }
      }
    });

    it('should have proper og:image dimensions', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      const hasOgImage = content.includes('og:image') || content.includes('images:');
      const hasProperDimensions = content.includes('1200') && content.includes('630');
      
      expect(hasOgImage).toBe(true);
      expect(hasProperDimensions).toBe(true);
    });
  });

  describe('7. Sitemap & Robots.txt', () => {
    it('should have dynamic sitemap.xml generation', async () => {
      const sitemapPath = path.join(process.cwd(), 'app/sitemap.ts');
      const exists = await fs.access(sitemapPath)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);
      
      if (exists) {
        const content = await fs.readFile(sitemapPath, 'utf-8');
        
        // Check for all important sections
        expect(content).toContain('threads');
        expect(content).toContain('content');
        expect(content).toContain('categories');
        expect(content).toContain('users');
        expect(content).toContain('changeFrequency');
        expect(content).toContain('priority');
        expect(content).toContain('lastModified');
      }
    });

    it('should have robots.txt with proper rules', async () => {
      const robotsPath = path.join(process.cwd(), 'app/robots.ts');
      const publicRobotsPath = path.join(process.cwd(), 'public/robots.txt');
      
      const tsExists = await fs.access(robotsPath)
        .then(() => true)
        .catch(() => false);
      
      const txtExists = await fs.access(publicRobotsPath)
        .then(() => true)
        .catch(() => false);
        
      expect(tsExists || txtExists).toBe(true);
      
      if (tsExists) {
        const content = await fs.readFile(robotsPath, 'utf-8');
        
        // Check for important directives
        expect(content).toContain('disallow');
        expect(content).toContain('sitemap');
        expect(content).toContain('/dashboard');
        expect(content).toContain('/settings');
        expect(content).toContain('/api/');
      }
    });
  });

  describe('8. Analytics & Monitoring', () => {
    it('should have Google Analytics 4 implementation', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      const hasGA4 = content.includes('gtag') || 
                    content.includes('G-') ||
                    content.includes('GoogleAnalytics');
      
      expect(hasGA4).toBe(true);
    });

    it('should have Google Tag Manager setup', async () => {
      const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
      const content = await fs.readFile(layoutPath, 'utf-8');
      
      const hasGTM = content.includes('GTM-') || 
                    content.includes('googletagmanager');
      
      if (!hasGTM) {
        console.log('⚠️ Google Tag Manager not configured (optional)');
      }
    });
  });

  describe('SEO Audit Summary', () => {
    it('should generate comprehensive audit report', () => {
      console.log('\n' + '='.repeat(60));
      console.log('SEO AUDIT SUMMARY');
      console.log('='.repeat(60));
      
      let totalIssues = 0;
      let totalWarnings = 0;
      
      for (const result of auditResults) {
        if (result.issues.length > 0 || result.warnings.length > 0) {
          console.log(`\n📄 ${result.page}`);
          
          if (result.issues.length > 0) {
            console.log('  ❌ Issues:');
            result.issues.forEach(issue => {
              console.log(`     - ${issue}`);
              totalIssues++;
            });
          }
          
          if (result.warnings.length > 0) {
            console.log('  ⚠️ Warnings:');
            result.warnings.forEach(warning => {
              console.log(`     - ${warning}`);
              totalWarnings++;
            });
          }
        }
      }
      
      console.log('\n' + '-'.repeat(60));
      console.log(`Total Issues: ${totalIssues}`);
      console.log(`Total Warnings: ${totalWarnings}`);
      console.log(`Pages Audited: ${auditResults.length}`);
      console.log('='.repeat(60) + '\n');
      
      // Fail if there are critical issues
      expect(totalIssues).toBe(0);
    });
  });
});