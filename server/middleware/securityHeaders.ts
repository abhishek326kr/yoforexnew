import helmet from 'helmet';
import type { Express } from 'express';

export function setupSecurityHeaders(app: Express) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Next.js-compatible CSP for all routes (except API which has stricter policy)
  // This allows Next.js to function while maintaining strong security
  const nextJsCSP = [
    "default-src 'self'",
    // Allow inline scripts and eval for Next.js (required for hydration and HMR)
    isDevelopment 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" 
      : "script-src 'self' 'unsafe-inline'",
    // Allow inline styles for Next.js styled-jsx and CSS modules
    "style-src 'self' 'unsafe-inline'",
    // Allow images from any HTTPS source (for user-generated content, CDNs, etc)
    "img-src 'self' data: https: http: blob:",
    // Allow fonts from self and data URIs
    "font-src 'self' data:",
    // Allow connections to self and WebSocket for Next.js HMR
    isDevelopment
      ? "connect-src 'self' ws: wss:"
      : "connect-src 'self'",
    // Prevent iframes
    "frame-src 'none'",
    // Prevent object/embed tags
    "object-src 'none'",
    // Prevent base tag hijacking
    "base-uri 'self'",
    // Only allow form submissions to self
    "form-action 'self'",
    // Prevent embedding in iframes
    "frame-ancestors 'none'",
    // Upgrade insecure requests in production
    !isDevelopment ? "upgrade-insecure-requests" : "",
  ].filter(Boolean).join('; ');

  // Use helmet for comprehensive security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isDevelopment 
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
          : ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: isDevelopment
          ? ["'self'", "ws:", "wss:"]
          : ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: isDevelopment ? [] : [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding resources
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: { action: 'deny' }, // Prevent clickjacking
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));
  
  // Override with even stricter CSP only for API routes
  app.use('/api/', (req, res, next) => {
    // Strict CSP for API endpoints - no inline scripts/styles needed
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self'; " +
      "img-src 'self' data: https: http:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none';"
    );
    next();
  });
  
  // Additional security headers for all routes
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );
    next();
  });
}
