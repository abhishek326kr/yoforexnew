/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Output mode for Autoscale deployment
  output: 'standalone',
  
  // Temporarily ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
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
    const isReplitDeployment = process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID;
    
    // If EXPRESS_URL is missing in production
    if (!expressUrl) {
      if (isProduction && !isReplitDeployment) {
        // Non-Replit production: Hard fail to prevent misconfig
        throw new Error(
          '🚨 CRITICAL: EXPRESS_URL environment variable is required for production deployment.\n' +
          'Set it in your deployment configuration.\n' +
          'Example: EXPRESS_URL=http://127.0.0.1:3001'
        );
      }
      
      // Replit/Autoscale: Allow build with default (start-production.sh sets it at runtime)
      const defaultUrl = 'http://127.0.0.1:3001';
      if (isReplitDeployment && isProduction) {
        console.warn(
          '⚠️  EXPRESS_URL not set during build phase (expected for Replit Autoscale).\n' +
          `   Using default: ${defaultUrl}\n` +
          '   start-production.sh will set the correct value at runtime.'
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
