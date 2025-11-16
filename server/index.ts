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

// CRITICAL FOR AUTOSCALE: Add immediate /health endpoint BEFORE any async initialization
// This endpoint must respond instantly (<10ms) for Autoscale health checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

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
    // IMPORTANT: Include optional port numbers (:\d+)? for published deployments
    const replitDomainPatterns = [
      /^https?:\/\/.*\.replit\.app(:\d+)?$/,      // Replit app domains (multi-level) with optional port
      /^https?:\/\/.*\.replit\.dev(:\d+)?$/,      // Replit dev domains (multi-level) with optional port
      /^https?:\/\/.*\.repl\.co(:\d+)?$/,         // Replit co domains (multi-level) with optional port
      /^https?:\/\/.*\.repl\.run(:\d+)?$/,        // Replit run domains (multi-level) with optional port
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
    
    // Create filter function for routes that should be proxied to Next.js
    const shouldProxyToNextJs = (pathname: string, req: any) => {
      // Don't proxy Express-handled routes
      if (pathname.startsWith('/api/')) return false;
      if (pathname.startsWith('/ws/')) return false;
      if (pathname === '/health') return false;
      if (pathname.startsWith('/static/')) return false;
      return true; // Proxy everything else to Next.js
    };
    
    const nextJsProxy = createProxyMiddleware({
      target: nextJsTarget,
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying for Next.js dev tools
      pathFilter: shouldProxyToNextJs, // Correct property name for v3.x
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
    } as any);
    
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
    // AUTOSCALE CRITICAL: Create lightweight Express app and bind port IMMEDIATELY
    // Heavy async initialization (auth, database, routes) happens AFTER port binding
    
    // Create bare-bones Express app with only /health endpoint for instant response
    const lightweightApp = express();
    lightweightApp.set("trust proxy", 1);
    
    // Add immediate /health endpoint (no dependencies, instant response)
    lightweightApp.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', timestamp: Date.now() });
    });
    
    // Create HTTP server with lightweight app
    const httpServer = createServer(lightweightApp);
    
    // Express API server runs on port 5000 (required by Replit/Autoscale)
    const port = parseInt(process.env.PORT || process.env.API_PORT || '5000', 10);
    
    // AUTOSCALE CRITICAL: Listen on port IMMEDIATELY (binds in <100ms)
    // /health endpoint responds instantly for health checks
    httpServer.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      log("Express server running API-only mode (React SPA archived)");
      
      // All async initialization happens AFTER port binding (non-blocking)
      // This ensures Autoscale health checks pass while initialization continues
      void (async () => {
        try {
          // Wait for full Express app initialization (auth, database, routes)
          log('[STARTUP] Loading full application (routes, auth, database)...');
          const fullApp = await appPromise;
          
          // Mount all routes from full app onto lightweight app
          // This preserves the /health endpoint while adding all other routes
          lightweightApp.use(fullApp);
          log('[STARTUP] Full application loaded and mounted');
          
          // PRODUCTION FIX: Create second HTTP server on API_PORT for Next.js internal API calls
          // This prevents Next.js rewrite loops where /api/* calls circle back through the proxy
          const apiPort = parseInt(process.env.API_PORT || '3001', 10);
          if (process.env.NODE_ENV === 'production' && apiPort !== port) {
            const apiServer = createServer(fullApp);
            apiServer.listen(apiPort, '127.0.0.1', () => {
              log(`[STARTUP] API server listening on http://127.0.0.1:${apiPort} (for Next.js rewrites)`);
            });
            
            // Close API server when main server closes
            httpServer.on('close', () => {
              log('[SHUTDOWN] Closing API server on port ' + apiPort);
              apiServer.close();
            });
          }
          
          // Wire WebSocket upgrade handler for Next.js dev tools/HMR
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
          
          // Initialize WebSocket (lightweight, minimal overhead)
          const io = initializeDashboardWebSocket(httpServer);
          fullApp.set('io', io);
          log("[STARTUP] WebSocket server initialized on /ws/dashboard and /ws/admin");
          
          // Background job initialization (deferred, non-blocking)
          let jobsStarted = false;
          const nextJsUrl = process.env.NEXT_INTERNAL_URL || 'http://127.0.0.1:3000';
          
          log('[STARTUP] Waiting for Next.js proxy to be ready...');
          
          // Fast initial check (15 attempts × 200ms = 3 seconds)
          for (let i = 0; i < 15; i++) {
            try {
              const response = await fetch(nextJsUrl, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(500)
              });
              if (response.status < 500) {
                log('[STARTUP] Next.js proxy verified ready');
                startBackgroundJobs(storage);
                startBotEngagementJob();
                startBotRefundJob();
                jobsStarted = true;
                log('[STARTUP] All background services initialized successfully');
                return;
              }
            } catch (e) {
              if (i < 14) await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          // If not ready, retry with backoff (don't block deployment)
          if (!jobsStarted) {
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
                  startBackgroundJobs(storage);
                  startBotEngagementJob();
                  startBotRefundJob();
                  jobsStarted = true;
                  log('[STARTUP] All background services initialized successfully (delayed)');
                }
              } catch (e) {
                // Keep retrying
              }
            }, 5000);
          }
        } catch (error) {
          console.error('[STARTUP] Async initialization failed:', error);
          console.error('[STARTUP] Server is still running, but some features may be unavailable');
        }
      })();
    });

    return httpServer;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server if this file is run directly (not imported by tests)
// PRODUCTION FIX: Check for both server/index.(ts|js) AND dist/index.js
// - Development: tsx runs server/index.ts
// - Production: node runs dist/index.js (esbuild bundle)
// - Tests: import this file without running server
const scriptPath = process.argv[1] || '';
const isMainModule = scriptPath.endsWith('server/index.ts') || 
                     scriptPath.endsWith('server/index.js') ||
                     scriptPath.endsWith('dist/index.js');

if (isMainModule) {
  console.log(`[STARTUP] Starting server from: ${scriptPath}`);
  startServer().catch((error) => {
    console.error('Fatal server startup error:', error);
    process.exit(1);
  });
} else {
  console.log(`[STARTUP] Module imported from: ${scriptPath} (server not started)`);
}
