import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import crypto from "crypto";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { generalApiLimiter } from "./rateLimiting";
import { storage } from "./storage";
import { startBackgroundJobs } from "./jobs/backgroundJobs";
import { startBotEngagementJob } from "./jobs/botEngagement";
import { startBotRefundJob } from "./jobs/botRefunds";
import { setupSecurityHeaders } from "./middleware/securityHeaders";
import { categoryRedirectMiddleware, trackCategoryViews } from "./middleware/categoryRedirects";
import { initializeDashboardWebSocket } from "./services/dashboardWebSocket";
import { serverErrorTracker, errorTrackingMiddleware } from "./middleware/errorTracking";
import { ipBanMiddleware, loginSecurityMiddleware } from './middleware/security';
import { getSecurityService } from './services/securityService';
import { auditLogger } from './middleware/auditLogger';

// Initialize security service
const securityService = getSecurityService(storage);

const app = express();

// Trust first proxy - required for correct rate limiting behind load balancers/proxies
app.set("trust proxy", 1);

// Apply security headers to all requests (before CORS)
setupSecurityHeaders(app);

// Apply category redirect middleware early in the stack
app.use(categoryRedirectMiddleware);
app.use(trackCategoryViews);

// Body parsing middleware MUST come before session middleware
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb', // Increased limit for error tracking bulk submissions
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configure CORS for cross-origin requests with credentials
// CORS must come AFTER body parsing but can be before or after sessions
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (e.g., mobile apps, Postman, same-origin)
    if (!origin) return callback(null, true);
    
    // Always allow localhost and 127.0.0.1 origins (safe local origins for development and error reporting)
    const localOriginPatterns = [
      /^https?:\/\/localhost:\d+$/,        // Any localhost port
      /^https?:\/\/127\.0\.0\.1:\d+$/,     // Any 127.0.0.1 port
      /^https?:\/\/0\.0\.0\.0:\d+$/,       // Any 0.0.0.0 port
    ];
    
    if (localOriginPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    // Always allow Replit domains (development and production)
    const replitDomainPatterns = [
      /^https?:\/\/.*\.replit\.app$/,      // Replit app domains (multi-level)
      /^https?:\/\/.*\.replit\.dev$/,      // Replit dev domains (multi-level)
      /^https?:\/\/.*\.repl\.co$/,         // Replit co domains (multi-level)
      /^https?:\/\/.*\.repl\.run$/,        // Replit run domains (multi-level)
    ];
    
    if (replitDomainPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    // Production domains
    const allowedProductionOrigins = [
      'https://yoforex.net',
      'https://www.yoforex.net',
      ...(process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [])
    ];
    
    if (allowedProductionOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log and deny unrecognized origins
    console.log('CORS: Origin not allowed:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Apply security middleware early in the chain
// Block banned IPs first (before any other processing)
app.use(ipBanMiddleware(storage));

// Track login attempts and detect brute force attacks
app.use(loginSecurityMiddleware(storage, securityService));

// Apply general rate limiting to all API routes
app.use("/api/", generalApiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize the app with all middleware and routes (without starting the server)
// This allows tests to import the app without starting an HTTP server
async function initializeApp() {
  try {
    // Session middleware MUST be set up BEFORE routes
    // Import and setup authentication middleware first
    const { setupAuth } = await import('./flexibleAuth');
    await setupAuth(app);
    
    // Setup local authentication (includes password reset endpoints)
    const { setupLocalAuth } = await import('./localAuth');
    await setupLocalAuth(app);
    
    // Add audit logging middleware after authentication setup
    app.use(auditLogger);
    
    const expressApp = await registerRoutes(app);
    
    // Proxy all non-Express requests to Next.js (running on internal port 3000)
    // This allows Express to handle API routes while Next.js handles pages
    const nextJsTarget = process.env.NEXT_INTERNAL_URL || 'http://127.0.0.1:3000';
    const nextJsProxy = createProxyMiddleware({
      target: nextJsTarget,
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying for Next.js dev tools
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      // Filter: Don't proxy Express-handled routes
      filter: (pathname: string, req: any) => {
        if (pathname.startsWith('/api/')) return false;
        if (pathname.startsWith('/ws/')) return false;
        if (pathname === '/health') return false;
        if (pathname.startsWith('/static/')) return false;
        return true; // Proxy everything else to Next.js
      },
      onProxyReq: (proxyReq: any, req: any, res: any) => {
        // Forward original protocol/host for Next.js to generate correct URLs
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      },
      onError: (err: any, req: any, res: any) => {
        log(`[PROXY ERROR] Failed to proxy ${req.url} to Next.js: ${err.message}`);
        // If Next.js isn't ready yet, send a friendly error
        if (!res.headersSent) {
          res.status(503).send('Next.js is starting up, please wait...');
        }
      }
    });
    
    expressApp.use(nextJsProxy);
    log(`[PROXY] Configured Next.js proxy to ${nextJsTarget} (filters: /api/*, /ws/*, /health, /static/*)`);
    
    // Register error tracking middleware to capture specialized error types
    // This middleware will capture errors and then pass them to the next error handler
    expressApp.use(errorTrackingMiddleware);
    
    // Add comprehensive error handling middleware AFTER routes
    expressApp.use(async (err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Use ServerErrorTracker to capture the error
      try {
        // Determine severity based on status code
        let severity: 'critical' | 'error' | 'warning' | 'info' = 'error';
        if (status >= 500) {
          severity = 'critical';
        } else if (status >= 400) {
          severity = 'error';
        } else {
          severity = 'warning';
        }
        
        // Use ServerErrorTracker to handle error persistence
        await serverErrorTracker.captureError(
          err,
          {
            requestId: (req as any).requestId || (req as any).session?.id || crypto.randomUUID(),
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body,
            headers: req.headers as Record<string, string>,
            errorType: 'internal',
            userId: (req as any).user?.id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
          },
          severity
        );
      } catch (trackingError) {
        // If error tracking fails, log it but don't block the response
        console.error('[EXPRESS ERROR HANDLER] Error tracking failed:', trackingError);
        console.error('[ORIGINAL ERROR]', err);
      }

      // Send response to client
      res.status(status).json({ 
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    log("Express app initialized (routes and middleware configured)");
    return expressApp;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    throw error;
  }
}

// Export the app initialization promise for testing
// Tests can await this to get a fully configured Express app without starting the server
export const appPromise = initializeApp();

// Start the HTTP server (only when running as main module, not when imported by tests)
async function startServer() {
  try {
    const expressApp = await appPromise;
    
    // React SPA removed - Next.js runs separately on port 3000
    // Express server now only serves API endpoints
    log("Express server running API-only mode (React SPA archived)");

    // Create HTTP server (WITHOUT initializing WebSocket yet)
    const httpServer = createServer(expressApp);
    
    // Wire WebSocket upgrade handler for Next.js dev tools/HMR
    // This ensures Next.js WebSockets work without interfering with dashboard sockets
    const nextJsUpgradeTarget = process.env.NEXT_INTERNAL_URL || 'http://127.0.0.1:3000';
    const nextJsUpgradeProxy = createProxyMiddleware({
      target: nextJsUpgradeTarget,
      ws: true,
      changeOrigin: true,
    });
    httpServer.on('upgrade', (req, socket, head) => {
      // Only proxy Next.js WebSockets (not /ws/* which are handled by Express)
      if (!req.url?.startsWith('/ws/')) {
        (nextJsUpgradeProxy as any).upgrade?.(req, socket as any, head);
      }
    });

    // Express API server with Vite frontend runs on port 5000 (required by Replit)
    // Use PORT env var first (Replit standard), then API_PORT, then default to 5000
    const port = parseInt(process.env.PORT || process.env.API_PORT || '5000', 10);
    
    // CRITICAL: Start listening IMMEDIATELY for Autoscale health checks
    // Port 5000 must open fast - all other initialization happens asynchronously
    httpServer.listen(port, "0.0.0.0", async () => {
      log(`serving on port ${port}`);
      
      // Initialize WebSocket immediately (lightweight, no dependencies)
      const io = initializeDashboardWebSocket(httpServer);
      expressApp.set('io', io); // Make WebSocket available to routes
      log("[STARTUP] WebSocket server initialized on /ws/dashboard and /ws/admin");
      
      // Async initialization of background jobs (doesn't block the listen callback)
      // This runs in parallel with Autoscale health checks
      let jobsStarted = false;
      const startJobs = async () => {
        if (jobsStarted) return; // Already started
        
        try {
          // Wait for Next.js proxy to be ready (for jobs that fetch pages)
          // Use root path / which is always available in Next.js
          const nextJsUrl = process.env.NEXT_INTERNAL_URL || 'http://127.0.0.1:3000';
          
          log('[STARTUP] Waiting for Next.js proxy to be ready...');
          // Initial fast check (15 attempts × 200ms = 3 seconds)
          for (let i = 0; i < 15; i++) {
            try {
              const response = await fetch(nextJsUrl, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(500)
              });
              // Accept any response (200, 301, 304, etc.) as long as Next.js is responding
              if (response.status < 500) {
                log('[STARTUP] Next.js proxy verified ready');
                
                // Storage is already initialized from app setup phase
                log('[STARTUP] Starting background jobs (all dependencies ready)');
                startBackgroundJobs(storage);
                
                // Initialize bot jobs
                startBotEngagementJob();
                startBotRefundJob();
                
                jobsStarted = true;
                log('[STARTUP] All background services initialized successfully');
                return; // Success
              }
            } catch (e) {
              // Not ready yet, will retry
              if (i < 14) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
          }
          
          // If still not ready after 3s, schedule retries with backoff (don't give up)
          log('[STARTUP] Next.js not ready after 3s - will retry every 5s until ready');
          const retryInterval = setInterval(async () => {
            try {
              const response = await fetch(nextJsUrl, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(1000)
              });
              if (response.status < 500) {
                clearInterval(retryInterval);
                log('[STARTUP] Next.js proxy now ready (delayed)');
                
                log('[STARTUP] Starting background jobs (delayed initialization)');
                startBackgroundJobs(storage);
                startBotEngagementJob();
                startBotRefundJob();
                
                jobsStarted = true;
                log('[STARTUP] All background services initialized successfully (delayed)');
              }
            } catch (e) {
              // Still not ready, will keep retrying
            }
          }, 5000); // Retry every 5 seconds
          
        } catch (error) {
          console.error('[STARTUP] Background jobs initialization failed:', error);
        }
      };
      
      startJobs();
    });

    return httpServer;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server if this file is run directly (not imported by tests)
// In ES modules, we check import.meta.url instead of require.main
const isMainModule = process.argv[1]?.endsWith('server/index.ts') || 
                     process.argv[1]?.endsWith('server/index.js');

if (isMainModule) {
  startServer().catch((error) => {
    console.error('Fatal server startup error:', error);
    process.exit(1);
  });
}
