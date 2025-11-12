import helmet from 'helmet';
import type { Express } from 'express';

export function setupSecurityHeaders(app: Express) {
  // Use helmet for comprehensive security headers
  // CRITICAL: Disable CSP for Next.js pages - Next.js sets its own CSP
  // Only apply strict CSP to API routes via middleware below
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled - Next.js handles CSP for pages
    crossOriginEmbedderPolicy: false, // Allow embedding
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: { action: 'deny' }, // Prevent clickjacking
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));
  
  // Additional security headers for all routes
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}
