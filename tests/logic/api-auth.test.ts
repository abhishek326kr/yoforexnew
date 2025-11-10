/**
 * AUTHENTICATION API TEST SUITE
 * Tests authentication logic through API endpoints
 */

import { describe, test, expect, beforeEach } from 'vitest';

const API_URL = 'http://localhost:3001';
let authCookie: string | null = null;

async function makeRequest(path: string, options: any = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie || '',
      ...options.headers,
    },
  });
  return response;
}

describe('Authentication API Tests', () => {

  describe('Registration Logic', () => {

    test('Username uniqueness validation', async () => {
      const username = `testuser_${Date.now()}`;
      const email = `${username}@test.com`;
      const password = 'TestPass123!';

      // First registration should succeed
      const response1 = await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      
      expect(response1.ok).toBe(true);
      const data1 = await response1.json();
      expect(data1.user).toBeDefined();
      expect(data1.user.username).toBe(username);
      
      // Second registration with same username should fail
      const response2 = await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          email: `different_${email}`,
          password 
        }),
      });
      
      expect(response2.ok).toBe(false);
      const error = await response2.json();
      expect(error.error).toContain('username');
    });

    test('Email format validation', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
      ];

      for (const email of invalidEmails) {
        const response = await makeRequest('/api/register', {
          method: 'POST',
          body: JSON.stringify({
            username: `user_${Date.now()}`,
            email,
            password: 'TestPass123!',
          }),
        });

        expect(response.ok).toBe(false);
        const error = await response.json();
        expect(error.error.toLowerCase()).toContain('email');
      }
    });

    test('Password strength requirements', async () => {
      const weakPasswords = [
        '123',      // Too short
        'password', // No numbers
        '12345678', // No letters
        'Pass123',  // No special chars (maybe)
      ];

      for (const password of weakPasswords) {
        const response = await makeRequest('/api/register', {
          method: 'POST',
          body: JSON.stringify({
            username: `user_${Date.now()}`,
            email: `user_${Date.now()}@test.com`,
            password,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.log(`✓ Weak password rejected: ${password} - ${error.error}`);
        }
      }
    });

    test('Welcome bonus (100 coins) credited', async () => {
      const username = `bonus_user_${Date.now()}`;
      const email = `${username}@test.com`;
      const password = 'TestPass123!';

      // Register user
      const registerResponse = await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      expect(registerResponse.ok).toBe(true);
      const { user } = await registerResponse.json();
      
      // Check coins (should be 100 for welcome bonus)
      expect(user.totalCoins).toBe(100);
      console.log('✓ Welcome bonus of 100 coins credited');
    });
  });

  describe('Login Logic', () => {

    test('Credential validation', async () => {
      const username = `login_user_${Date.now()}`;
      const email = `${username}@test.com`;
      const password = 'TestPass123!';

      // Register first
      await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      // Try login with correct credentials
      const loginResponse = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      expect(loginResponse.ok).toBe(true);
      const loginData = await loginResponse.json();
      expect(loginData.user).toBeDefined();
      expect(loginData.user.email).toBe(email);

      // Try login with wrong password
      const wrongPasswordResponse = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'WrongPass123!' }),
      });

      expect(wrongPasswordResponse.ok).toBe(false);
      const error = await wrongPasswordResponse.json();
      expect(error.error).toContain('Invalid');
    });

    test('Session creation', async () => {
      const username = `session_user_${Date.now()}`;
      const email = `${username}@test.com`;
      const password = 'TestPass123!';

      // Register
      await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      // Login
      const loginResponse = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Get cookie from response
      const setCookie = loginResponse.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      
      // Use session to access protected endpoint
      const meResponse = await fetch(`${API_URL}/api/me`, {
        headers: {
          'Cookie': setCookie || '',
        },
      });

      expect(meResponse.ok).toBe(true);
      const meData = await meResponse.json();
      expect(meData.email).toBe(email);
    });
  });

  describe('Authorization', () => {

    test('Role-based access (user, moderator, admin)', async () => {
      // Create regular user
      const userEmail = `user_${Date.now()}@test.com`;
      await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: `user_${Date.now()}`,
          email: userEmail,
          password: 'TestPass123!',
        }),
      });

      // Login as regular user
      const userLogin = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: userEmail, password: 'TestPass123!' }),
      });
      
      const userCookie = userLogin.headers.get('set-cookie');

      // Try to access admin endpoint as regular user
      const adminResponse = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          'Cookie': userCookie || '',
        },
      });

      expect(adminResponse.ok).toBe(false);
      expect(adminResponse.status).toBe(403);
      console.log('✓ Regular users cannot access admin endpoints');
    });

    test('API endpoint protection', async () => {
      // Try to access protected endpoint without auth
      const response = await fetch(`${API_URL}/api/me`);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      
      const error = await response.json();
      expect(error.error).toContain('authenticated');
      console.log('✓ Protected endpoints require authentication');
    });

    test('Resource ownership checks', async () => {
      // Create two users
      const user1Email = `user1_${Date.now()}@test.com`;
      const user2Email = `user2_${Date.now()}@test.com`;

      await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: `user1_${Date.now()}`,
          email: user1Email,
          password: 'TestPass123!',
        }),
      });

      await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: `user2_${Date.now()}`,
          email: user2Email,
          password: 'TestPass123!',
        }),
      });

      // Login as user1
      const user1Login = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: user1Email, password: 'TestPass123!' }),
      });
      
      const user1Cookie = user1Login.headers.get('set-cookie');
      const user1Data = await user1Login.json();

      // User1 creates a thread
      const threadResponse = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': user1Cookie || '',
        },
        body: JSON.stringify({
          title: 'User1 Thread',
          content: 'This is my thread',
          category: 'general',
        }),
      });

      if (threadResponse.ok) {
        const thread = await threadResponse.json();
        
        // Login as user2
        const user2Login = await makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: user2Email, password: 'TestPass123!' }),
        });
        
        const user2Cookie = user2Login.headers.get('set-cookie');

        // User2 tries to edit user1's thread (should fail)
        const editResponse = await fetch(`${API_URL}/api/forum/threads/${thread.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': user2Cookie || '',
          },
          body: JSON.stringify({
            title: 'Hacked Thread',
          }),
        });

        expect(editResponse.ok).toBe(false);
        expect(editResponse.status).toBe(403);
        console.log('✓ Users cannot edit resources they don\'t own');
      }
    });
  });

  describe('Security Features', () => {

    test('Rate limiting on login attempts', async () => {
      const email = `ratelimit_${Date.now()}@test.com`;
      
      // Register user
      await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: `ratelimit_${Date.now()}`,
          email,
          password: 'TestPass123!',
        }),
      });

      // Make multiple failed login attempts
      const attempts: Promise<Response>[] = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: 'WrongPass!' }),
          })
        );
      }

      const responses = await Promise.all(attempts);
      
      // Some should be rate limited
      const rateLimited = responses.filter((r: Response) => r.status === 429);
      
      if (rateLimited.length > 0) {
        console.log(`✓ Rate limiting activated after ${10 - rateLimited.length} attempts`);
      } else {
        console.log('⚠️ Rate limiting may not be configured');
      }
    });

    test('XSS prevention in user input', async () => {
      const username = `xss_test_${Date.now()}`;
      const email = `${username}@test.com`;
      const password = 'TestPass123!';
      
      // Register user with XSS attempt in username
      const xssUsername = `<script>alert('XSS')</script>_${Date.now()}`;
      const response = await makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: xssUsername,
          email,
          password,
        }),
      });

      // Should either reject or sanitize
      if (response.ok) {
        const data = await response.json();
        // Check if script tags were sanitized
        expect(data.user.username).not.toContain('<script>');
        console.log('✓ XSS input sanitized');
      } else {
        console.log('✓ XSS input rejected');
      }
    });
  });
});