#!/usr/bin/env tsx
import { db } from '../server/db';
import { content, contentPurchases, contentReviews, users, coinTransactions } from '../shared/schema';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@yoforex.com';
const ADMIN_PASS = 'Admin@YoForex2025!';

interface TestResult {
  phase: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(phase: string, test: string, status: TestResult['status'], error?: string, details?: any) {
  const result: TestResult = { phase, test, status };
  if (error) result.error = error;
  if (details) result.details = details;
  results.push(result);
  
  const icon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
  console.log(`${icon} [${phase}] ${test}`);
  if (error) console.error(`   Error: ${error}`);
  if (details) console.log(`   Details:`, details);
}

async function testAPI(endpoint: string, options: any = {}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

async function testPhase0_InitialState() {
  console.log('\n📊 PHASE 0: Initial State Check');
  
  // Check database state
  try {
    const contentCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(content);
    const publishedCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(content)
      .where(eq(content.status, 'approved'));
    const purchaseCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(contentPurchases);
    const reviewCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(contentReviews);
    
    logResult('PHASE 0', 'Database State', 'PASS', undefined, {
      totalContent: contentCount[0]?.count || 0,
      publishedContent: publishedCount[0]?.count || 0,
      purchases: purchaseCount[0]?.count || 0,
      reviews: reviewCount[0]?.count || 0,
    });
  } catch (error: any) {
    logResult('PHASE 0', 'Database State', 'FAIL', error.message);
  }
  
  // Test marketplace API endpoint
  const marketplaceTest = await testAPI('/api/content?status=approved');
  if (marketplaceTest.ok) {
    logResult('PHASE 0', 'Marketplace API', 'PASS', undefined, {
      items: Array.isArray(marketplaceTest.data) ? marketplaceTest.data.length : 0
    });
  } else {
    logResult('PHASE 0', 'Marketplace API', 'FAIL', marketplaceTest.error || 'API not responding');
  }
  
  // Test publish categories endpoint
  const categoriesTest = await testAPI('/api/publish/categories');
  if (categoriesTest.ok) {
    logResult('PHASE 0', 'Categories API', 'PASS', undefined, {
      categories: Array.isArray(categoriesTest.data) ? categoriesTest.data.length : 0
    });
  } else {
    logResult('PHASE 0', 'Categories API', 'FAIL', categoriesTest.error);
  }
}

async function testPhase1_PublishingWorkflow() {
  console.log('\n📝 PHASE 1: EA Publishing Workflow');
  
  // Test file upload endpoint
  const uploadTest = await testAPI('/api/upload/ea', {
    method: 'POST',
  });
  
  if (uploadTest.status === 401) {
    logResult('PHASE 1', 'File Upload Auth Check', 'PASS', 'Requires authentication as expected');
  } else if (!uploadTest.ok) {
    logResult('PHASE 1', 'File Upload Endpoint', 'WARNING', 'Endpoint may have issues');
  }
  
  // Test publish endpoint structure
  const publishTest = await testAPI('/api/publish', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  
  if (publishTest.status === 401) {
    logResult('PHASE 1', 'Publish Auth Check', 'PASS', 'Requires authentication as expected');
  } else if (!publishTest.ok) {
    logResult('PHASE 1', 'Publish Endpoint', 'WARNING', 'Endpoint may need fixes');
  }
}

async function testPhase2_MarketplaceBrowsing() {
  console.log('\n🛍️ PHASE 2: Marketplace Browsing');
  
  // Test different filter combinations
  const filterTests = [
    { query: '?type=ea', name: 'Filter by Type (EA)' },
    { query: '?category=Scalping', name: 'Filter by Category' },
    { query: '?sort=price_low', name: 'Sort by Price Low' },
    { query: '?sort=price_high', name: 'Sort by Price High' },
    { query: '?sort=latest', name: 'Sort by Latest' },
    { query: '?isFree=true', name: 'Filter Free Items' },
  ];
  
  for (const test of filterTests) {
    const result = await testAPI(`/api/content${test.query}`);
    if (result.ok) {
      logResult('PHASE 2', test.name, 'PASS', undefined, {
        items: Array.isArray(result.data) ? result.data.length : 0
      });
    } else {
      logResult('PHASE 2', test.name, 'FAIL', result.error);
    }
  }
  
  // Test search functionality
  const searchTest = await testAPI('/api/content?search=test');
  if (searchTest.ok) {
    logResult('PHASE 2', 'Search Functionality', 'PASS');
  } else {
    logResult('PHASE 2', 'Search Functionality', 'FAIL', searchTest.error);
  }
}

async function testPhase3_ProductDetails() {
  console.log('\n📋 PHASE 3: Product Detail Pages');
  
  // Get a sample product
  const productsResult = await testAPI('/api/content?limit=1');
  if (productsResult.ok && Array.isArray(productsResult.data) && productsResult.data.length > 0) {
    const product = productsResult.data[0];
    
    // Test product detail by ID
    const detailById = await testAPI(`/api/content/${product.id}`);
    if (detailById.ok) {
      logResult('PHASE 3', 'Product Detail by ID', 'PASS');
    } else {
      logResult('PHASE 3', 'Product Detail by ID', 'FAIL', detailById.error);
    }
    
    // Test product detail by slug
    if (product.slug) {
      const detailBySlug = await testAPI(`/api/content/slug/${product.slug}`);
      if (detailBySlug.ok) {
        logResult('PHASE 3', 'Product Detail by Slug', 'PASS');
      } else {
        logResult('PHASE 3', 'Product Detail by Slug', 'FAIL', detailBySlug.error);
      }
    }
    
    // Test reviews endpoint
    const reviewsTest = await testAPI(`/api/content/${product.id}/reviews`);
    if (reviewsTest.ok) {
      logResult('PHASE 3', 'Product Reviews', 'PASS', undefined, {
        reviews: Array.isArray(reviewsTest.data) ? reviewsTest.data.length : 0
      });
    } else {
      logResult('PHASE 3', 'Product Reviews', 'FAIL', reviewsTest.error);
    }
  } else {
    logResult('PHASE 3', 'No products to test', 'WARNING', 'Create products first');
  }
}

async function testPhase4_TransactionSystem() {
  console.log('\n💰 PHASE 4: Transaction System');
  
  // Test purchase endpoint structure
  const purchaseTest = await testAPI('/api/content/purchase/test-id', {
    method: 'POST',
  });
  
  if (purchaseTest.status === 401) {
    logResult('PHASE 4', 'Purchase Auth Check', 'PASS', 'Requires authentication');
  } else if (purchaseTest.status === 404) {
    logResult('PHASE 4', 'Purchase Endpoint', 'PASS', 'Returns 404 for invalid ID');
  } else {
    logResult('PHASE 4', 'Purchase Endpoint', 'WARNING', 'May need review');
  }
  
  // Check coin transaction integrity
  try {
    const recentTransactions = await db.select()
      .from(coinTransactions)
      .where(gte(coinTransactions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
      .orderBy(desc(coinTransactions.createdAt))
      .limit(10);
    
    logResult('PHASE 4', 'Recent Transactions', 'PASS', undefined, {
      count: recentTransactions.length
    });
  } catch (error: any) {
    logResult('PHASE 4', 'Recent Transactions', 'FAIL', error.message);
  }
}

async function testPhase5_ReviewSystem() {
  console.log('\n⭐ PHASE 5: Review & Rating System');
  
  // Test review submission endpoint
  const reviewTest = await testAPI('/api/content/review', {
    method: 'POST',
    body: JSON.stringify({
      contentId: 'test-id',
      rating: 5,
      review: 'Test review',
    }),
  });
  
  if (reviewTest.status === 401) {
    logResult('PHASE 5', 'Review Auth Check', 'PASS', 'Requires authentication');
  } else if (!reviewTest.ok) {
    logResult('PHASE 5', 'Review Submission', 'WARNING', reviewTest.error);
  }
}

async function testPhase6_SellerFeatures() {
  console.log('\n👤 PHASE 6: Seller Features');
  
  // Test user content endpoint
  const userContentTest = await testAPI('/api/me/content');
  if (userContentTest.status === 401) {
    logResult('PHASE 6', 'User Content Auth Check', 'PASS', 'Requires authentication');
  } else if (!userContentTest.ok) {
    logResult('PHASE 6', 'User Content Endpoint', 'WARNING', userContentTest.error);
  }
  
  // Test top sellers endpoint
  const topSellersTest = await testAPI('/api/content/top-sellers');
  if (topSellersTest.ok) {
    logResult('PHASE 6', 'Top Sellers', 'PASS', undefined, {
      hasData: topSellersTest.data?.topSellers ? true : false
    });
  } else {
    logResult('PHASE 6', 'Top Sellers', 'FAIL', topSellersTest.error);
  }
}

async function generateTestReport() {
  console.log('\n' + '='.repeat(80));
  console.log('MARKETPLACE SYSTEM TEST REPORT');
  console.log('='.repeat(80));
  
  const phases = [...new Set(results.map(r => r.phase))];
  
  for (const phase of phases) {
    const phaseResults = results.filter(r => r.phase === phase);
    const passed = phaseResults.filter(r => r.status === 'PASS').length;
    const failed = phaseResults.filter(r => r.status === 'FAIL').length;
    const warnings = phaseResults.filter(r => r.status === 'WARNING').length;
    
    console.log(`\n${phase}:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️ Warnings: ${warnings}`);
    
    // List failures
    const failures = phaseResults.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
      console.log('\n  Failures:');
      failures.forEach(f => {
        console.log(`    - ${f.test}: ${f.error || 'Unknown error'}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  const totalPassed = results.filter(r => r.status === 'PASS').length;
  const totalFailed = results.filter(r => r.status === 'FAIL').length;
  const totalWarnings = results.filter(r => r.status === 'WARNING').length;
  
  console.log('OVERALL SUMMARY:');
  console.log(`  Total Tests: ${results.length}`);
  console.log(`  ✅ Passed: ${totalPassed}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
  console.log(`  ⚠️ Warnings: ${totalWarnings}`);
  console.log(`  Success Rate: ${((totalPassed / results.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
}

async function main() {
  console.log('🚀 Starting YoForex Marketplace System Test');
  console.log('='.repeat(80));
  
  try {
    await testPhase0_InitialState();
    await testPhase1_PublishingWorkflow();
    await testPhase2_MarketplaceBrowsing();
    await testPhase3_ProductDetails();
    await testPhase4_TransactionSystem();
    await testPhase5_ReviewSystem();
    await testPhase6_SellerFeatures();
    
    await generateTestReport();
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        failed: results.filter(r => r.status === 'FAIL').length,
        warnings: results.filter(r => r.status === 'WARNING').length,
      }
    };
    
    await require('fs').promises.writeFile(
      'marketplace-test-report.json',
      JSON.stringify(reportData, null, 2)
    );
    console.log('\n📄 Report saved to marketplace-test-report.json');
    
  } catch (error: any) {
    console.error('Fatal error during testing:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);