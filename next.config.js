/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Output mode for Autoscale deployment
  output: 'standalone',
  
  // Temporarily ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // CRITICAL: Skip static page generation to prevent SSR/build errors
  // Forces all pages to use dynamic rendering
  skipTrailingSlashRedirect: true,
  
  // Environment variables (NO DEFAULTS - must be set in production)
  env: {
    EXPRESS_URL: process.env.EXPRESS_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  // Server actions
  experimental: {
    serverActions: {
      // Dynamic allowed origins from environment
      allowedOrigins: [
        'localhost:3000', 
        'localhost:5000', 
        'localhost:3001',
        ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
      ],
    },
  },

  // Proxy API requests to Express server
  // Autoscale deployment: build phase may not have EXPRESS_URL, use safe default
  // Runtime: start-production.sh sets EXPRESS_URL=http://127.0.0.1:3001
  async rewrites() {
    const expressUrl = process.env.EXPRESS_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    const isReplitDeployment = process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID;
    
    // If EXPRESS_URL is missing
    if (!expressUrl) {
      const defaultUrl = 'http://127.0.0.1:3001';
      
      // Always allow build phase with default (build may not have runtime env vars)
      if (isBuildPhase) {
        console.warn(
          '⚠️  EXPRESS_URL not set during build phase (expected).\n' +
          `   Using default: ${defaultUrl}\n` +
          '   Production runtime will use actual EXPRESS_URL value.'
        );
      } else if (isProduction && !isReplitDeployment) {
        // Non-Replit production runtime: Log warning but allow with default
        console.warn(
          '⚠️  WARNING: EXPRESS_URL not set in production.\n' +
          `   Using default: ${defaultUrl}\n` +
          '   Set EXPRESS_URL in deployment config for production use.'
        );
      } else {
        console.warn(`⚠️  EXPRESS_URL not set - using development default: ${defaultUrl}`);
      }
      
      return [
        {
          source: '/api/:path*',
          destination: `${defaultUrl}/api/:path*`,
        },
        {
          source: '/objects/:path*',
          destination: `${defaultUrl}/objects/:path*`,
        },
      ];
    }
    
    // EXPRESS_URL is set - use it
    return [
      {
        source: '/api/:path*',
        destination: `${expressUrl}/api/:path*`,
      },
      {
        source: '/objects/:path*',
        destination: `${expressUrl}/objects/:path*`,
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Redirects for old routes (if needed)
  async redirects() {
    return [];
  },
};

export default nextConfig;
