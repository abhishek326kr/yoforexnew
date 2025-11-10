#!/usr/bin/env npx tsx

/**
 * Comprehensive Category API Testing Script
 * Tests all category-related API endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  statusCode?: number;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: string,
  endpoint: string,
  expectedStatus = 200,
  body?: any
): Promise<TestResult> {
  try {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const statusCode = response.status;
    
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }
    } else {
      data = await response.text();
    }

    const status = statusCode === expectedStatus ? 'PASS' : 'FAIL';
    const message = status === 'PASS' 
      ? `✓ ${method} ${endpoint} returned ${statusCode}`
      : `✗ ${method} ${endpoint} returned ${statusCode}, expected ${expectedStatus}`;

    return {
      endpoint,
      method,
      status,
      statusCode,
      message,
      data
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: `✗ ${method} ${endpoint} failed: ${error.message}`,
    };
  }
}

async function runTests() {
  console.log('🔍 Starting Comprehensive Category API Tests...\n');
  console.log('='.repeat(70));

  // PHASE 1.2: Category API Endpoints Testing
  console.log('\n📋 PHASE 1.2: CATEGORY API ENDPOINTS\n');

  // Test GET endpoints
  const getEndpoints = [
    { path: '/api/categories', desc: 'List all categories' },
    { path: '/api/categories/tree', desc: 'Category tree structure' },
    { path: '/api/categories/tree/all', desc: 'All categories tree' },
    { path: '/api/categories/tree/top', desc: 'Top-level categories' },
    { path: '/api/categories/tree/top?limit=3', desc: 'Top 3 categories' },
    { path: '/api/categories/forex-trading-robots-eas-2025', desc: 'Get category by slug' },
    { path: '/api/categories/find/forex', desc: 'Find category (fuzzy)' },
    { path: '/api/categories/forex-trading-robots-eas-2025/threads', desc: 'Category threads' },
    { path: '/api/categories/forex-trading-robots-eas-2025/subcategories', desc: 'Subcategories' },
    { path: '/api/categories/forex-trading-robots-eas-2025/with-children', desc: 'Category with children' },
    { path: '/api/categories/forex-trading-robots-eas-2025/stats', desc: 'Category statistics' },
    { path: '/api/categories/stats/batch?slugs=forex-trading-robots-eas-2025,crypto-trading-strategies-eas', desc: 'Batch stats' },
    { path: '/api/publish/categories', desc: 'Published categories' },
    { path: '/api/category-path/expert-advisors-trading-robots-mt4-mt5', desc: 'Category breadcrumbs' },
  ];

  for (const endpoint of getEndpoints) {
    const result = await testEndpoint('GET', endpoint.path);
    results.push(result);
    
    console.log(`${result.message} - ${endpoint.desc}`);
    
    // Show data info
    if (result.status === 'PASS' && result.data) {
      if (Array.isArray(result.data)) {
        console.log(`  → Returned ${result.data.length} items`);
        if (result.data.length > 0 && result.data[0].name) {
          console.log(`  → First item: ${result.data[0].name}`);
        }
      } else if (typeof result.data === 'object' && result.data.name) {
        console.log(`  → Category: ${result.data.name}`);
      }
    } else if (result.status === 'FAIL') {
      console.log(`  → Error: ${JSON.stringify(result.data)}`);
    }
  }

  // Test non-existent category (should return 404)
  console.log('\n📋 TESTING ERROR HANDLING\n');
  const notFoundTest = await testEndpoint('GET', '/api/categories/non-existent-category', 404);
  results.push(notFoundTest);
  console.log(notFoundTest.message);

  // PHASE 1.3: Hierarchy & Slug Testing
  console.log('\n📋 PHASE 1.3: HIERARCHY & SLUG TESTING\n');
  
  // Test parent-child relationships
  const hierarchyTests = [
    '/api/categories/forex-trading-robots-eas-2025',
    '/api/categories/expert-advisors-trading-robots-mt4-mt5',
    '/api/categories/forex-indicators-mt4-mt5',
  ];

  for (const endpoint of hierarchyTests) {
    const result = await testEndpoint('GET', endpoint);
    results.push(result);
    
    if (result.status === 'PASS' && result.data) {
      const category = result.data;
      console.log(`✓ ${category.name}:`);
      console.log(`  → Slug: ${category.slug}`);
      console.log(`  → Parent: ${category.parentSlug || 'None (Top-level)'}`);
      console.log(`  → Threads: ${category.threadCount || 0}`);
      console.log(`  → Posts: ${category.postCount || 0}`);
    }
  }

  // Test fuzzy matching
  console.log('\n📋 TESTING FUZZY SLUG MATCHING\n');
  const fuzzyTests = [
    { slug: 'forex', expected: 'forex-trading-robots-eas-2025' },
    { slug: 'crypto', expected: 'crypto-trading-strategies-eas' },
    { slug: 'binary', expected: 'binary-options-indicators-robots' },
  ];

  for (const test of fuzzyTests) {
    const result = await testEndpoint('GET', `/api/categories/find/${test.slug}`);
    if (result.status === 'PASS' && result.data) {
      const match = result.data.matchType === 'fuzzy' ? '≈' : '=';
      console.log(`✓ "${test.slug}" ${match} ${result.data.name} (${result.data.slug})`);
    } else {
      console.log(`✗ Failed to find category for "${test.slug}"`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 TEST RESULTS SUMMARY\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`⚠ Warnings: ${warnings}`);
  console.log(`Total: ${results.length}`);

  // Detailed failures
  if (failed > 0) {
    console.log('\n🔴 FAILED TESTS:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.message}`);
        if (r.data) {
          console.log(`    Data: ${JSON.stringify(r.data).substring(0, 100)}`);
        }
      });
  }

  // Critical issues to fix
  console.log('\n📝 CRITICAL ISSUES TO FIX:');
  const issues = [];

  // Check if categories are empty
  const categoriesEndpoint = results.find(r => r.endpoint === '/api/categories');
  if (categoriesEndpoint?.data && Array.isArray(categoriesEndpoint.data) && categoriesEndpoint.data.length === 0) {
    issues.push('Categories endpoint returns empty array despite 60 categories in database');
  }

  // Check if tree structure works
  const treeEndpoint = results.find(r => r.endpoint === '/api/categories/tree');
  if (treeEndpoint?.data && Array.isArray(treeEndpoint.data) && treeEndpoint.data.length === 0) {
    issues.push('Category tree returns empty despite hierarchical data in database');
  }

  // Check specific category fetching
  const specificCategory = results.find(r => r.endpoint.includes('forex-trading-robots'));
  if (specificCategory?.status === 'FAIL') {
    issues.push('Cannot fetch specific categories by slug');
  }

  if (issues.length > 0) {
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    console.log('  ✅ No critical issues found!');
  }

  console.log('\n✨ Category API testing completed!\n');
}

// Run tests
runTests().catch(console.error);