import type { Express } from 'express';

export function setupSecurityHeaders(app: Express) {
  // Minimal security headers only - NO CSP, NO helmet
  // User specifically requested no CSP headers across the website
  app.use((req, res, next) => {
    // Only set basic security headers for API routes
    if (req.path.startsWith('/api')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }
    next();
  });
}
