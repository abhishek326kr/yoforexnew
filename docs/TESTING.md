# Testing Guide

## Table of Contents
- [Overview](#overview)
- [Test Philosophy](#test-philosophy)
- [Test Suite Architecture](#test-suite-architecture)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [SEO Testing](#seo-testing)
- [Security Testing](#security-testing)
- [Running Tests](#running-tests)
- [Writing New Tests](#writing-new-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

YoForex maintains comprehensive test coverage across all layers of the application. Our testing strategy ensures reliability, performance, and security while enabling confident deployments.

### Test Statistics
- **Total Tests**: 500+
- **Coverage**: 85%+
- **Test Types**: Unit, Integration, E2E, Performance
- **Test Runners**: Vitest, Playwright, K6

## Test Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Fast Feedback**: Quick tests that run frequently
3. **Reliable Tests**: No flaky tests, deterministic results
4. **Meaningful Coverage**: Quality over quantity
5. **Test as Documentation**: Tests explain the code

### Testing Pyramid

```
         /\
        /E2E\       (10%) - Critical user paths
       /------\
      /  API   \    (20%) - Integration tests
     /----------\
    /   Service  \  (30%) - Business logic
   /--------------\
  /    Unit Tests  \ (40%) - Components, utilities
 /------------------\
```

## Test Suite Architecture

### Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/         # React component tests
│   ├── services/          # Service layer tests
│   ├── utils/            # Utility function tests
│   └── hooks/            # Custom hook tests
├── integration/           # Integration tests
│   ├── api/              # API endpoint tests
│   ├── database/         # Database tests
│   └── services/         # Service integration tests
├── e2e/                  # End-to-end tests
│   ├── auth/            # Authentication flows
│   ├── forum/           # Forum features
│   ├── marketplace/     # Marketplace flows
│   └── admin/           # Admin workflows
├── performance/         # Performance tests
│   ├── load/           # Load testing
│   ├── stress/         # Stress testing
│   └── benchmarks/     # Performance benchmarks
├── security/           # Security tests
│   ├── auth/          # Authentication tests
│   ├── injection/     # Injection tests
│   └── validation/    # Input validation tests
├── fixtures/          # Test data
├── mocks/            # Mock implementations
└── utils/            # Test utilities
```

## Unit Testing

### Component Testing

```typescript
// tests/unit/components/ThreadCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadCard } from '@/components/forum/ThreadCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ThreadCard', () => {
  const mockThread = {
    id: 'thread-1',
    title: 'Test Thread',
    content: 'Test content',
    author: { id: 'user-1', username: 'testuser', avatar: null },
    createdAt: new Date('2025-01-01'),
    likes: 5,
    replies: 3,
    views: 100
  };
  
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render thread information correctly', () => {
    render(<ThreadCard thread={mockThread} />, { wrapper });
    
    expect(screen.getByText('Test Thread')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('5 likes')).toBeInTheDocument();
    expect(screen.getByText('3 replies')).toBeInTheDocument();
  });
  
  it('should handle like action', async () => {
    const onLike = jest.fn();
    render(<ThreadCard thread={mockThread} onLike={onLike} />, { wrapper });
    
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);
    
    await waitFor(() => {
      expect(onLike).toHaveBeenCalledWith('thread-1');
    });
  });
  
  it('should show loading state', () => {
    render(<ThreadCard thread={mockThread} isLoading />, { wrapper });
    
    expect(screen.getByTestId('thread-skeleton')).toBeInTheDocument();
  });
  
  it('should handle missing author gracefully', () => {
    const threadWithoutAuthor = { ...mockThread, author: null };
    
    render(<ThreadCard thread={threadWithoutAuthor} />, { wrapper });
    
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });
});
```

### Service Testing

```typescript
// tests/unit/services/SweetsService.test.ts
import { SweetsService } from '@/services/SweetsService';
import { db } from '@/server/db';

jest.mock('@/server/db');

describe('SweetsService', () => {
  let service: SweetsService;
  
  beforeEach(() => {
    service = new SweetsService();
    jest.clearAllMocks();
  });
  
  describe('awardCoins', () => {
    it('should award coins with correct amount', async () => {
      const userId = 'user-123';
      const amount = 25;
      const trigger = 'forum.thread.created';
      
      const mockWallet = { 
        userId, 
        balance: 100,
        lockedBalance: 10 
      };
      
      db.query.userWallet.findFirst.mockResolvedValue(mockWallet);
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ ...mockWallet, balance: 125 }])
        })
      });
      
      const result = await service.awardCoins(userId, amount, trigger);
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(125);
      expect(db.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount,
          type: 'credit',
          trigger
        })
      );
    });
    
    it('should handle vault deposit (10%)', async () => {
      const result = await service.awardCoins('user-123', 100, 'test');
      
      expect(result.walletAmount).toBe(90);
      expect(result.vaultAmount).toBe(10);
    });
    
    it('should throw error for invalid amount', async () => {
      await expect(
        service.awardCoins('user-123', -50, 'test')
      ).rejects.toThrow('Invalid amount');
    });
    
    it('should respect daily limits', async () => {
      // Mock daily transactions
      db.query.coinTransactions.findMany.mockResolvedValue(
        Array(50).fill({ amount: 10 }) // 50 transactions today
      );
      
      await expect(
        service.awardCoins('user-123', 10, 'test')
      ).rejects.toThrow('Daily transaction limit reached');
    });
  });
  
  describe('processWithdrawal', () => {
    it('should calculate fees based on loyalty tier', async () => {
      const testCases = [
        { tier: 'bronze', amount: 1000, expectedFee: 70 },
        { tier: 'silver', amount: 1000, expectedFee: 50 },
        { tier: 'gold', amount: 1000, expectedFee: 30 },
        { tier: 'platinum', amount: 1000, expectedFee: 10 },
        { tier: 'diamond', amount: 1000, expectedFee: 0 }
      ];
      
      for (const { tier, amount, expectedFee } of testCases) {
        const fee = service.calculateWithdrawalFee(amount, tier);
        expect(fee).toBe(expectedFee);
      }
    });
  });
});
```

### Hook Testing

```typescript
// tests/unit/hooks/useThreads.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useThreads } from '@/hooks/useThreads';
import { createWrapper } from '../utils/testUtils';

describe('useThreads', () => {
  it('should fetch threads for category', async () => {
    const { result } = renderHook(
      () => useThreads('category-1'),
      { wrapper: createWrapper() }
    );
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.threads).toHaveLength(10);
    expect(result.current.threads[0]).toHaveProperty('title');
  });
  
  it('should handle pagination', async () => {
    const { result, rerender } = renderHook(
      ({ page }) => useThreads('category-1', { page }),
      { 
        wrapper: createWrapper(),
        initialProps: { page: 1 }
      }
    );
    
    await waitFor(() => !result.current.isLoading);
    const firstPageData = result.current.threads;
    
    rerender({ page: 2 });
    
    await waitFor(() => !result.current.isLoading);
    const secondPageData = result.current.threads;
    
    expect(firstPageData).not.toEqual(secondPageData);
  });
});
```

## Integration Testing

### API Testing

```typescript
// tests/integration/api/forum.test.ts
import request from 'supertest';
import { app } from '@/server/app';
import { db } from '@/server/db';
import { createTestUser, cleanupDatabase } from '../utils/testHelpers';

describe('Forum API Integration', () => {
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    await cleanupDatabase();
    const user = await createTestUser();
    userId = user.id;
    authToken = user.token;
  });
  
  afterAll(async () => {
    await cleanupDatabase();
  });
  
  describe('POST /api/forum/threads', () => {
    it('should create thread with valid data', async () => {
      const threadData = {
        title: 'Integration Test Thread',
        content: 'This is test content for integration testing',
        categoryId: 'test-category',
        tags: ['test', 'integration']
      };
      
      const response = await request(app)
        .post('/api/forum/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(threadData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        title: threadData.title,
        content: threadData.content,
        userId,
        tags: threadData.tags
      });
      
      // Verify database
      const dbThread = await db.query.forumThreads.findFirst({
        where: eq(forumThreads.id, response.body.id)
      });
      
      expect(dbThread).toBeTruthy();
      expect(dbThread.title).toBe(threadData.title);
      
      // Verify coins awarded
      const wallet = await db.query.userWallet.findFirst({
        where: eq(userWallet.userId, userId)
      });
      
      expect(wallet.balance).toBeGreaterThanOrEqual(25);
    });
    
    it('should validate input data', async () => {
      const invalidData = {
        title: '', // Empty title
        content: 'Content',
        categoryId: 'invalid-uuid'
      };
      
      const response = await request(app)
        .post('/api/forum/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining('required')
        })
      );
    });
    
    it('should enforce rate limiting', async () => {
      const requests = Array(11).fill(null).map(() => 
        request(app)
          .post('/api/forum/threads')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Test', content: 'Test', categoryId: 'test' })
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/forum/threads/:id', () => {
    let threadId: string;
    
    beforeEach(async () => {
      const thread = await db.insert(forumThreads).values({
        title: 'Test Thread',
        content: 'Test Content',
        userId,
        categoryId: 'test-category'
      }).returning();
      
      threadId = thread[0].id;
    });
    
    it('should return thread with replies', async () => {
      // Create some replies
      await db.insert(forumReplies).values([
        { threadId, userId, content: 'Reply 1' },
        { threadId, userId, content: 'Reply 2' }
      ]);
      
      const response = await request(app)
        .get(`/api/forum/threads/${threadId}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        id: threadId,
        title: 'Test Thread',
        replies: expect.arrayContaining([
          expect.objectContaining({ content: 'Reply 1' }),
          expect.objectContaining({ content: 'Reply 2' })
        ])
      });
    });
    
    it('should increment view count', async () => {
      const viewsBefore = await db.query.forumThreads.findFirst({
        where: eq(forumThreads.id, threadId)
      });
      
      await request(app).get(`/api/forum/threads/${threadId}`);
      
      const viewsAfter = await db.query.forumThreads.findFirst({
        where: eq(forumThreads.id, threadId)
      });
      
      expect(viewsAfter.viewCount).toBe(viewsBefore.viewCount + 1);
    });
  });
});
```

### Database Testing

```typescript
// tests/integration/database/transactions.test.ts
import { db } from '@/server/db';
import { purchaseItem } from '@/services/MarketplaceService';

describe('Database Transactions', () => {
  it('should rollback on failure', async () => {
    const userId = 'user-123';
    const itemId = 'item-456';
    
    // Set insufficient balance
    await db.update(userWallet).set({ balance: 10 }).where(eq(userWallet.userId, userId));
    
    // Attempt purchase (should fail)
    await expect(
      purchaseItem(userId, itemId, 100)
    ).rejects.toThrow('Insufficient balance');
    
    // Verify no partial changes
    const wallet = await db.query.userWallet.findFirst({
      where: eq(userWallet.userId, userId)
    });
    const purchases = await db.query.contentPurchases.findMany({
      where: eq(contentPurchases.userId, userId)
    });
    
    expect(wallet.balance).toBe(10); // Unchanged
    expect(purchases).toHaveLength(0); // No purchase recorded
  });
  
  it('should handle concurrent updates safely', async () => {
    const userId = 'user-123';
    const initialBalance = 1000;
    
    await db.update(userWallet).set({ balance: initialBalance }).where(eq(userWallet.userId, userId));
    
    // Simulate concurrent coin awards
    const awards = Array(10).fill(null).map((_, i) => 
      awardCoins(userId, 10, `test-${i}`)
    );
    
    await Promise.all(awards);
    
    const finalWallet = await db.query.userWallet.findFirst({
      where: eq(userWallet.userId, userId)
    });
    
    // Should have exactly 100 more coins (10 × 10)
    expect(finalWallet.balance).toBe(initialBalance + 100);
  });
});
```

## End-to-End Testing

### User Flow Testing

```typescript
// tests/e2e/auth/registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete full registration process', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="username"]', 'newuser123');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    // Accept terms
    await page.check('[name="acceptTerms"]');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Verify email sent
    await expect(page).toHaveURL('/verify-email');
    await expect(page.locator('.alert-success')).toContainText('verification email');
    
    // Simulate email verification (in test environment)
    await page.goto('/api/test/verify-email?token=test-token');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Login with new account
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('[type="submit"]');
    
    // Should be logged in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('newuser123');
    
    // Verify welcome bonus
    await expect(page.locator('[data-testid="coin-balance"]')).toContainText('100');
  });
  
  test('should handle duplicate email', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="username"]', 'newusername');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    await page.click('[type="submit"]');
    
    await expect(page.locator('.error-message')).toContainText('Email already registered');
  });
});
```

### Forum Testing

```typescript
// tests/e2e/forum/thread-creation.spec.ts
import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test.describe('Thread Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'testuser@example.com', 'password');
  });
  
  test('should create and interact with thread', async ({ page }) => {
    // Navigate to forum
    await page.goto('/forum');
    
    // Select category
    await page.click('[data-testid="category-general"]');
    
    // Click create thread
    await page.click('[data-testid="create-thread-btn"]');
    
    // Fill thread form
    await page.fill('[name="title"]', 'E2E Test Thread');
    
    // Use rich text editor
    const editor = page.locator('[data-testid="thread-editor"]');
    await editor.click();
    await editor.type('This is a test thread with **bold** text.');
    
    // Add tags
    await page.fill('[name="tags"]', 'test,e2e,automated');
    
    // Submit
    await page.click('[data-testid="submit-thread"]');
    
    // Verify thread created
    await expect(page).toHaveURL(/\/thread\/.+/);
    await expect(page.locator('h1')).toContainText('E2E Test Thread');
    
    // Verify coins awarded
    const notification = page.locator('[data-testid="notification"]');
    await expect(notification).toContainText('earned 25 coins');
    
    // Test interaction - Add reply
    await page.fill('[data-testid="reply-input"]', 'Great thread!');
    await page.click('[data-testid="post-reply"]');
    
    await expect(page.locator('[data-testid="reply-1"]')).toContainText('Great thread!');
    
    // Test like functionality
    await page.click('[data-testid="like-thread"]');
    await expect(page.locator('[data-testid="like-count"]')).toContainText('1');
  });
});
```

### Marketplace Testing

```typescript
// tests/e2e/marketplace/purchase-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('EA Purchase Flow', () => {
  test('should complete EA purchase', async ({ page }) => {
    // Login
    await login(page, 'buyer@example.com', 'password');
    
    // Browse marketplace
    await page.goto('/marketplace');
    
    // Filter by category
    await page.selectOption('[data-testid="category-filter"]', 'ea');
    
    // Sort by popularity
    await page.selectOption('[data-testid="sort-filter"]', 'popular');
    
    // Click on first EA
    await page.click('[data-testid="product-card-1"]');
    
    // View details
    await expect(page.locator('h1')).toContainText('ScalpMaster Pro');
    await expect(page.locator('[data-testid="price"]')).toContainText('1000 coins');
    
    // Check reviews
    await page.click('[data-testid="reviews-tab"]');
    await expect(page.locator('[data-testid="review-count"]')).toContainText('42 reviews');
    
    // Purchase
    await page.click('[data-testid="purchase-btn"]');
    
    // Confirm purchase modal
    await expect(page.locator('.modal')).toBeVisible();
    await page.click('[data-testid="confirm-purchase"]');
    
    // Verify purchase success
    await expect(page.locator('.success-message')).toContainText('Purchase successful');
    await expect(page.locator('[data-testid="download-btn"]')).toBeVisible();
    
    // Verify coins deducted
    const balance = await page.locator('[data-testid="coin-balance"]').textContent();
    expect(parseInt(balance)).toBeLessThan(5000);
  });
});
```

## Performance Testing

### Load Testing

```javascript
// tests/performance/load/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function () {
  // Test forum listing
  let response = http.get('https://yoforex.net/api/forum/threads');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // Test thread creation (authenticated)
  const payload = JSON.stringify({
    title: `Load Test Thread ${Date.now()}`,
    content: 'This is a load test thread',
    categoryId: 'general',
  });
  
  response = http.post('https://yoforex.net/api/forum/threads', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  });
  
  check(response, {
    'thread created': (r) => r.status === 201,
    'has thread id': (r) => JSON.parse(r.body).id !== undefined,
  });
  
  sleep(2);
}
```

### Stress Testing

```javascript
// tests/performance/stress/database-stress.js
export const options = {
  stages: [
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 1000 }, // Spike to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 500 },  // Back to 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% under 2 seconds
    http_req_failed: ['rate<0.2'],     // Error rate under 20%
  },
};
```

### Performance Benchmarks

```typescript
// tests/performance/benchmarks/render.bench.ts
import { bench, describe } from 'vitest';
import { render } from '@testing-library/react';
import { ThreadList } from '@/components/ThreadList';

describe('Component Render Performance', () => {
  bench('ThreadList with 10 items', () => {
    const threads = generateThreads(10);
    render(<ThreadList threads={threads} />);
  });
  
  bench('ThreadList with 100 items', () => {
    const threads = generateThreads(100);
    render(<ThreadList threads={threads} />);
  });
  
  bench('ThreadList with 1000 items', () => {
    const threads = generateThreads(1000);
    render(<ThreadList threads={threads} />);
  });
});

// Run with: npm run bench
// Results:
// ThreadList with 10 items: 12ms
// ThreadList with 100 items: 45ms
// ThreadList with 1000 items: 320ms
```

## SEO Testing

### Meta Tags Testing

```typescript
// tests/seo/meta-tags.test.ts
import { render } from '@testing-library/react';
import { Metadata } from 'next';
import { generateMetadata } from '@/app/forum/[category]/page';

describe('SEO Meta Tags', () => {
  it('should generate correct metadata for forum category', async () => {
    const metadata = await generateMetadata({
      params: { category: 'general-discussion' }
    });
    
    expect(metadata).toMatchObject({
      title: 'General Discussion - YoForex Forum',
      description: expect.stringContaining('forex'),
      openGraph: {
        title: 'General Discussion - YoForex Forum',
        description: expect.any(String),
        type: 'website',
        url: 'https://yoforex.net/forum/general-discussion'
      },
      twitter: {
        card: 'summary_large_image',
        title: 'General Discussion - YoForex Forum'
      }
    });
  });
  
  it('should include structured data', () => {
    const structuredData = generateStructuredData('thread', {
      title: 'Best EA Settings',
      author: 'trader123',
      datePublished: '2025-01-01'
    });
    
    expect(structuredData).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Best EA Settings',
      author: {
        '@type': 'Person',
        name: 'trader123'
      }
    });
  });
});
```

### Lighthouse Testing

```typescript
// tests/seo/lighthouse.test.ts
import { playAudit } from 'playwright-lighthouse';
import { test } from '@playwright/test';

test.describe('Lighthouse Audits', () => {
  test('should pass performance thresholds', async ({ page }) => {
    await page.goto('/');
    
    const result = await playAudit({
      page,
      thresholds: {
        performance: 90,
        accessibility: 90,
        'best-practices': 90,
        seo: 90,
      },
      port: 9222,
    });
    
    expect(result.lhr.categories.performance.score * 100).toBeGreaterThan(90);
    expect(result.lhr.categories.accessibility.score * 100).toBeGreaterThan(90);
    expect(result.lhr.categories.seo.score * 100).toBeGreaterThan(90);
  });
});
```

## Security Testing

### Authentication Testing

```typescript
// tests/security/auth/authentication.test.ts
describe('Authentication Security', () => {
  it('should prevent SQL injection in login', async () => {
    const maliciousInputs = [
      "admin' OR '1'='1",
      "'; DROP TABLE users; --",
      "admin'--",
      "' OR 1=1--"
    ];
    
    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: input, password: 'password' });
      
      expect(response.status).toBe(401);
      expect(response.body).not.toContain('SQL');
    }
  });
  
  it('should enforce password complexity', async () => {
    const weakPasswords = [
      'password',
      '12345678',
      'qwerty',
      'Password',
      'Password1'
    ];
    
    for (const password of weakPasswords) {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'password',
          message: expect.stringContaining('complexity')
        })
      );
    }
  });
  
  it('should prevent session fixation', async () => {
    const sessionBefore = await getSession();
    
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password' });
    
    const sessionAfter = await getSession();
    
    expect(sessionAfter.id).not.toBe(sessionBefore.id);
  });
});
```

### Input Validation Testing

```typescript
// tests/security/validation/xss.test.ts
describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg/onload=alert("XSS")>',
    '"><script>alert("XSS")</script>'
  ];
  
  it('should sanitize thread content', async () => {
    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/api/forum/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test',
          content: payload,
          categoryId: 'general'
        });
      
      if (response.status === 201) {
        expect(response.body.content).not.toContain('<script>');
        expect(response.body.content).not.toContain('javascript:');
        expect(response.body.content).not.toContain('onerror');
      }
    }
  });
});
```

## Running Tests

### Command Line

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ThreadCard.test.ts

# Run tests matching pattern
npm test -- --grep "authentication"

# Run tests with debugging
npm run test:debug
```

### VS Code Integration

```json
// .vscode/settings.json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm run test",
  "vitest.include": ["**/*.test.ts", "**/*.spec.ts"],
  "vitest.exclude": ["**/node_modules/**", "**/dist/**"]
}
```

### CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

## Writing New Tests

### Test Template

```typescript
// tests/unit/components/NewComponent.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewComponent } from '@/components/NewComponent';
import { createMockProps } from '../utils/mockFactory';

describe('NewComponent', () => {
  let defaultProps: ComponentProps;
  
  beforeEach(() => {
    defaultProps = createMockProps();
    jest.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should render with required props', () => {
      render(<NewComponent {...defaultProps} />);
      
      expect(screen.getByTestId('new-component')).toBeInTheDocument();
    });
    
    it('should handle optional props', () => {
      render(<NewComponent {...defaultProps} optional="value" />);
      
      expect(screen.getByText('value')).toBeInTheDocument();
    });
  });
  
  describe('Interactions', () => {
    it('should handle click events', async () => {
      const onClick = jest.fn();
      render(<NewComponent {...defaultProps} onClick={onClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(onClick).toHaveBeenCalledTimes(1);
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should display error state', () => {
      render(<NewComponent {...defaultProps} error="Test error" />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('Test error');
    });
  });
});
```

### Test Utilities

```typescript
// tests/utils/testUtils.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    createdAt: new Date(),
    ...overrides
  };
}

export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
}
```

## Test Coverage

### Coverage Requirements

| Type | Minimum | Target |
|------|---------|--------|
| Statements | 70% | 85% |
| Branches | 60% | 80% |
| Functions | 70% | 85% |
| Lines | 70% | 85% |

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Coverage summary
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   85.23 |    78.45 |   82.10 |   85.67 |
 components                  |   88.45 |    82.30 |   86.20 |   88.90 |
  ThreadCard.tsx            |   92.30 |    88.00 |   90.00 |   92.50 |
  UserProfile.tsx           |   86.70 |    78.50 |   84.00 |   87.00 |
 services                   |   82.60 |    75.40 |   79.80 |   83.00 |
  SweetsService.ts          |   85.20 |    78.00 |   82.00 |   85.50 |
  ForumService.ts           |   80.00 |    72.80 |   77.60 |   80.50 |
 utils                      |   90.80 |    85.20 |   88.50 |   91.00 |
-----------------------------|---------|----------|---------|---------|
```

### Improving Coverage

```typescript
// Identify uncovered lines
npm run test:coverage -- --reporter=text-lcov

// Focus on critical paths
const criticalPaths = [
  'authentication flow',
  'payment processing',
  'data validation',
  'error handling'
];

// Add tests for edge cases
describe('Edge Cases', () => {
  it('should handle null values');
  it('should handle empty arrays');
  it('should handle network timeouts');
  it('should handle concurrent requests');
});
```

## Best Practices

### Test Quality

1. **Descriptive Names**: Test names should explain what is being tested
2. **Arrange-Act-Assert**: Clear test structure
3. **Single Assertion**: One logical assertion per test
4. **Independent Tests**: Tests should not depend on each other
5. **Clean State**: Always clean up after tests

### Performance

1. **Parallel Execution**: Run independent tests in parallel
2. **Mock External Services**: Don't make real API calls
3. **Minimize Database Hits**: Use in-memory databases for tests
4. **Selective Testing**: Only run affected tests during development

### Maintenance

1. **DRY Principle**: Extract common test utilities
2. **Update Tests**: Update tests when changing functionality
3. **Remove Obsolete Tests**: Delete tests for removed features
4. **Regular Review**: Review and refactor tests periodically

## Summary

The YoForex testing suite ensures:
- **Reliability**: Comprehensive coverage of critical paths
- **Performance**: Fast feedback during development
- **Security**: Validation of security measures
- **Quality**: Consistent code quality
- **Confidence**: Safe deployments to production

Remember: Tests are not just for finding bugs, they're documentation of intended behavior.