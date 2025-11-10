import { describe, test, expect } from 'vitest';

describe('Simple Test', () => {
  test('Basic test works', () => {
    expect(1 + 1).toBe(2);
  });

  test('API endpoint accessible', async () => {
    const response = await fetch('http://localhost:3001/api/stats');
    expect(response.ok).toBe(true);
  });
});