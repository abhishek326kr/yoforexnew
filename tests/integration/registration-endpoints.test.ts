/**
 * REGISTRATION ENDPOINTS - INTEGRATION TEST SUITE
 * 
 * Integration tests that verify registration endpoints handle mixed camelCase/snake_case
 * payloads correctly by filtering duplicate columns before database insertion.
 * 
 * CRITICAL BUG CONTEXT:
 * - Drizzle ORM maps both twoFactorEnabled (camelCase) and two_factor_enabled (snake_case) 
 *   to the same database column
 * - This causes SQL error: "column \"two_factor_enabled\" specified more than once"
 * - The filterUserRegistrationDuplicates() function dynamically filters snake_case duplicates
 * - Applied to both /api/register and /api/auth/register endpoints
 * 
 * INTEGRATION TEST COVERAGE (2 tests):
 * ✓ /api/register handles mixed camelCase/snake_case fields
 * ✓ /api/auth/register handles mixed camelCase/snake_case fields
 * 
 * These tests ensure:
 * 1. Registration endpoints accept payloads with both naming conventions
 * 2. No "duplicate column" SQL errors are thrown
 * 3. Users are successfully created with 200/201 status (NEVER 429)
 * 4. Regression protection: future developers can't remove the filter without tests failing
 * 
 * TESTING APPROACH:
 * - Uses supertest to test the Express app directly (no HTTP server required)
 * - Imports the appPromise from server/index.ts
 * - Rate limiters are DISABLED in test environment (NODE_ENV=test)
 * - Tests MUST reach registration logic and return 200/201 (NEVER 429)
 * - If tests get 429, they FAIL (rate limiter should be disabled in tests)
 */

import { describe, test, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../../server/index';

let app: Express;

describe('Registration Endpoints - Mixed Case Handling (Integration)', () => {
  
  // Wait for app initialization before running tests
  beforeAll(async () => {
    app = await appPromise;
  });

  test('POST /api/register filters snake_case duplicates', async () => {
    // Test with payload containing both camelCase and snake_case duplicates
    // This would cause "column specified more than once" error without the filter
    const response = await request(app)
      .post('/api/register')
      .send({
        username: `testuser${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'Test',
        first_name: 'Test',  // snake_case duplicate - should be filtered
        lastName: 'User',
        last_name: 'User',   // snake_case duplicate - should be filtered
        twoFactorEnabled: false,
        two_factor_enabled: false,  // snake_case duplicate - should be filtered
      });

    // CRITICAL: Test MUST NOT be rate limited (429)
    // Rate limiters are disabled in test environment to ensure tests reach registration logic
    expect(response.status).not.toBe(429);
    
    // MUST succeed with 200 or 201 - proving the filter prevented duplicate column error
    expect([200, 201]).toContain(response.status);
    
    // Verify response contains user data
    const data = response.body;
    const userData = data.user || data;
    expect(userData).toBeDefined();
    expect(userData.username).toBeDefined();
    
    console.log('✓ /api/register successfully filtered snake_case duplicates and reached registration logic');
  });

  test('POST /api/auth/register filters snake_case duplicates', async () => {
    // Test the alternative registration endpoint with same mixed-case payload
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `auth${Date.now()}@example.com`,
        password: 'SecurePass456!',
        firstName: 'Auth',
        first_name: 'Auth',  // snake_case duplicate - should be filtered
        lastName: 'Test',
        last_name: 'Test',   // snake_case duplicate - should be filtered
        emailVerified: false,
        email_verified: false,  // snake_case duplicate - should be filtered
      });

    // CRITICAL: Test MUST NOT be rate limited (429)
    // Rate limiters are disabled in test environment to ensure tests reach registration logic
    expect(response.status).not.toBe(429);
    
    // MUST succeed with 200 or 201 - proving the filter prevented duplicate column error
    expect([200, 201]).toContain(response.status);
    
    // Verify response contains success message (different format than /api/register)
    const data = response.body;
    expect(data).toBeDefined();
    // /api/auth/register returns {message: "..."} instead of {user: {...}}
    expect(data.message || data.success).toBeDefined();
    
    console.log('✓ /api/auth/register successfully filtered snake_case duplicates and reached registration logic');
  });

  /**
   * CRITICAL NOTE ON RATE LIMITING:
   * Rate limiters are DISABLED when NODE_ENV=test to ensure integration tests
   * always reach the registration logic. If these tests fail with 429, it means:
   * 1. NODE_ENV is not set to 'test' in the test environment
   * 2. Rate limiter bypass logic in server/middleware/rateLimiter.ts is broken
   * 
   * These tests MUST reach registration logic and return 200/201, NOT 429.
   */
});
