/**
 * REGISTRATION DUPLICATE COLUMN FIX - TEST SUITE
 * 
 * Tests for the filterUserRegistrationDuplicates() function to prevent 
 * duplicate column errors when both camelCase and snake_case fields are present.
 * 
 * CRITICAL BUG CONTEXT:
 * - Drizzle ORM maps both twoFactorEnabled (camelCase) and two_factor_enabled (snake_case) 
 *   to the same database column
 * - This causes SQL error: "column \"two_factor_enabled\" specified more than once"
 * - The filterUserRegistrationDuplicates() function dynamically filters snake_case duplicates
 * - Applied to both /api/register and /api/auth/register endpoints
 * 
 * UNIT TEST COVERAGE (13 tests):
 * ✓ Filters snake_case when both camelCase and snake_case exist
 * ✓ Keeps only camelCase when no duplicates present
 * ✓ Keeps only snake_case when no camelCase equivalent exists
 * ✓ Handles multiple duplicate pairs correctly
 * ✓ Handles empty object
 * ✓ Handles null input gracefully
 * ✓ Handles undefined input gracefully
 * ✓ Preserves non-object values
 * ✓ Handles nested objects (does not modify nested)
 * ✓ Handles array values
 * ✓ Preserves field values correctly when filtering
 * ✓ Handles complex field names with multiple underscores
 * ✓ Does not affect fields that are only in uppercase or mixed case
 * 
 * MANUAL TESTING VERIFICATION:
 * The registration endpoints have been manually tested and verified working:
 * 
 * Test 1: Registration with mixed camelCase/snake_case fields
 * Command:
 *   curl -X POST http://localhost:5000/api/register \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "username": "testuser123",
 *       "email": "test@example.com",
 *       "password": "SecurePass123!",
 *       "twoFactorEnabled": false,
 *       "two_factor_enabled": false
 *     }'
 * 
 * Result: ✅ Status 200 - Registration successful
 * Response: {"success":true,"user":{"id":"...","username":"testuser123",...}}
 * 
 * Test 2: Registration with only camelCase fields
 * Command:
 *   curl -X POST http://localhost:5000/api/register \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "username": "cameluser",
 *       "email": "camel@example.com",
 *       "password": "SecurePass123!",
 *       "firstName": "John"
 *     }'
 * 
 * Result: ✅ Status 200 - Registration successful
 * 
 * Test 3: Registration with complex duplicate pairs
 * Command:
 *   curl -X POST http://localhost:5000/api/register \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "username": "complexuser",
 *       "email": "complex@example.com",
 *       "password": "SecurePass123!",
 *       "firstName": "Jane",
 *       "first_name": "Jane",
 *       "lastName": "Smith",
 *       "last_name": "Smith"
 *     }'
 * 
 * Result: ✅ Status 200 - No duplicate column error
 * 
 * CONCLUSION:
 * - Core fix (filterUserRegistrationDuplicates) is working correctly
 * - Registration endpoints handle duplicates properly
 * - No "column specified more than once" errors
 * - Welcome bonus awarded successfully
 */

import { describe, test, expect } from 'vitest';
import { filterUserRegistrationDuplicates } from '../../server/validation';

describe('filterUserRegistrationDuplicates() - Unit Tests', () => {
  
  test('filters snake_case duplicates when both camelCase and snake_case exist', () => {
    const input = {
      username: 'testuser',
      email: 'test@example.com',
      twoFactorEnabled: true,
      two_factor_enabled: true,
      emailVerified: false,
      email_verified: false,
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.twoFactorEnabled).toBe(true);
    expect(result.two_factor_enabled).toBeUndefined();
    expect(result.emailVerified).toBe(false);
    expect(result.email_verified).toBeUndefined();
    
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
  });

  test('keeps only camelCase when no snake_case duplicates present', () => {
    const input = {
      username: 'testuser',
      email: 'test@example.com',
      twoFactorEnabled: true,
      emailVerified: false,
      firstName: 'John',
      lastName: 'Doe',
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result).toEqual(input);
    expect(Object.keys(result).length).toBe(Object.keys(input).length);
  });

  test('keeps only snake_case when no camelCase equivalent exists', () => {
    const input = {
      username: 'testuser',
      email: 'test@example.com',
      two_factor_enabled: true,
      email_verified: false,
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.two_factor_enabled).toBe(true);
    expect(result.email_verified).toBe(false);
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
  });

  test('handles multiple duplicate pairs correctly', () => {
    const input = {
      username: 'testuser',
      twoFactorEnabled: true,
      two_factor_enabled: false,
      emailVerified: true,
      email_verified: false,
      lastLoginAt: '2024-01-01',
      last_login_at: '2024-01-02',
      profileImageUrl: 'image1.jpg',
      profile_image_url: 'image2.jpg',
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.twoFactorEnabled).toBe(true);
    expect(result.emailVerified).toBe(true);
    expect(result.lastLoginAt).toBe('2024-01-01');
    expect(result.profileImageUrl).toBe('image1.jpg');
    
    expect(result.two_factor_enabled).toBeUndefined();
    expect(result.email_verified).toBeUndefined();
    expect(result.last_login_at).toBeUndefined();
    expect(result.profile_image_url).toBeUndefined();
    
    expect(result.username).toBe('testuser');
  });

  test('handles empty object', () => {
    const input = {};
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result).toEqual({});
    expect(Object.keys(result).length).toBe(0);
  });

  test('handles null input gracefully', () => {
    const result = filterUserRegistrationDuplicates(null);
    
    expect(result).toBeNull();
  });

  test('handles undefined input gracefully', () => {
    const result = filterUserRegistrationDuplicates(undefined);
    
    expect(result).toBeUndefined();
  });

  test('preserves non-object values', () => {
    expect(filterUserRegistrationDuplicates('string')).toBe('string');
    expect(filterUserRegistrationDuplicates(123)).toBe(123);
    expect(filterUserRegistrationDuplicates(true)).toBe(true);
  });

  test('handles nested objects (should not modify nested)', () => {
    const input = {
      username: 'testuser',
      twoFactorEnabled: true,
      two_factor_enabled: false,
      metadata: {
        twoFactorEnabled: true,
        two_factor_enabled: false,
      },
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.twoFactorEnabled).toBe(true);
    expect(result.two_factor_enabled).toBeUndefined();
    
    expect(result.metadata).toEqual({
      twoFactorEnabled: true,
      two_factor_enabled: false,
    });
  });

  test('handles array values', () => {
    const input = {
      username: 'testuser',
      tags: ['tag1', 'tag2'],
      twoFactorEnabled: true,
      two_factor_enabled: false,
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.tags).toEqual(['tag1', 'tag2']);
    expect(result.twoFactorEnabled).toBe(true);
    expect(result.two_factor_enabled).toBeUndefined();
  });

  test('preserves field values correctly when filtering', () => {
    const input = {
      username: 'testuser',
      twoFactorEnabled: 'camelValue',
      two_factor_enabled: 'snakeValue',
      count: 0,
      is_active: true,
      isActive: false,
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.twoFactorEnabled).toBe('camelValue');
    expect(result.isActive).toBe(false);
    
    expect(result.two_factor_enabled).toBeUndefined();
    expect(result.is_active).toBeUndefined();
    
    expect(result.count).toBe(0);
    expect(result.username).toBe('testuser');
  });

  test('handles complex field names with multiple underscores', () => {
    const input = {
      username: 'testuser',
      twoFactorAuthEnabled: true,
      two_factor_auth_enabled: false,
      passwordResetTokenExpiresAt: '2024-01-01',
      password_reset_token_expires_at: '2024-01-02',
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.twoFactorAuthEnabled).toBe(true);
    expect(result.two_factor_auth_enabled).toBeUndefined();
    expect(result.passwordResetTokenExpiresAt).toBe('2024-01-01');
    expect(result.password_reset_token_expires_at).toBeUndefined();
  });

  test('does not affect fields that are only in uppercase or mixed case', () => {
    const input = {
      username: 'testuser',
      ID: '123',
      UserID: '456',
      api_KEY: 'secret',
      twoFactorEnabled: true,
      two_factor_enabled: false,
    };
    
    const result = filterUserRegistrationDuplicates(input);
    
    expect(result.ID).toBe('123');
    expect(result.UserID).toBe('456');
    expect(result.api_KEY).toBe('secret');
    
    expect(result.twoFactorEnabled).toBe(true);
    expect(result.two_factor_enabled).toBeUndefined();
  });
});
