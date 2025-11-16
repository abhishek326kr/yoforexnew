# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders. It offers forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to be a leading hub for forex traders by fostering community, providing valuable resources, and enhancing trading experiences. The business vision is to establish a self-sustaining platform with significant market potential.

## User Preferences
### Communication Style
- Use simple, everyday language
- Avoid technical jargon when explaining to user
- Be concise and clear

### Task Execution Workflow (CRITICAL - ALWAYS FOLLOW)

**When starting ANY new work session:**

1. **Error Dashboard Check (MANDATORY FIRST STEP)**
   - **ALWAYS** check error monitoring dashboard at `/admin/errors` BEFORE starting ANY new task
   - Review all unsolved/active errors first (check database and admin panel)
   - Fix ALL critical and high-severity errors before proceeding with new work
   - Verify no TypeScript errors, routing errors, API errors, database errors, or connection issues
   - Check ALL logs: frontend console logs, backend Express logs, Next.js build logs
   - Review error categories: Unsolved, Solved, To-Be-Solved
   - **This ensures system stability before adding new features or making changes**
   - **NEVER skip this step - ALL errors must be resolved first before starting new work**

**When receiving a new task:**

2. **Deep Analysis Phase**
   - Think thoroughly about the task before starting
   - Consider all edge cases and implications
   - Identify potential challenges upfront

3. **Planning Phase (MANDATORY)**
   - Call `architect` tool with `responsibility: "plan"` to get strategic guidance
   - Break down complex tasks into clear, logical subtasks
   - Create comprehensive plan with dependencies identified
   - Document the approach before implementation

4. **Delegation Phase**
   - Use `start_subagent` for complex, multi-step subtasks
   - Provide clear context and success criteria to subagents
   - Ensure subagents have all necessary file paths and context

5. **Autonomous Execution**
   - **DO NOT ask user for confirmation mid-task**
   - Work through entire task list to completion
   - Handle errors and obstacles independently
   - Only return to user when task is 100% complete or genuinely blocked

6. **Documentation Phase (MANDATORY)**
   - Update replit.md regularly during work
   - Document what was changed and why
   - Keep documentation clean, organized, and current
   - Remove outdated information
   - Add completion dates to major changes

7. **Review Phase (BEFORE COMPLETION)**
   - Call `architect` with `responsibility: "evaluate_task"` to review all work
   - Fix any issues architect identifies
   - Only mark tasks complete after architect approval

### Documentation Standards

- **Update Frequency:** After each major change
- **Keep Clean:** Remove outdated/deprecated information
- **Be Specific:** Include file paths, dates, and reasons for changes
- **Section Organization:** Recent Changes should list newest first with dates

## System Architecture

YoForex utilizes a hybrid frontend built with Next.js and a robust Express.js backend, with PostgreSQL for data persistence.

-   **Hybrid Frontend Architecture:** Next.js (App Router, Server Components, ISR) for the frontend, and Express.js for RESTful APIs, Replit OIDC authentication, rate limiting, and input validation.
-   **UI/UX:** Modern design with vibrant gradients, glassmorphism, bright product cards, hover effects, color-coded badges, gradient pricing, shimmer loading skeletons, star ratings, and micro-animations.
-   **Authentication Pattern:** Client-side authentication checks with `isLoading`, `isAuthenticated`, and `useAuthPrompt()` for three-state rendering.
-   **Database Design:** PostgreSQL with Drizzle ORM, featuring 25+ tables, critical indexes, connection pooling, SSL/TLS, and automatic retry logic.
-   **System Design Choices:**
    -   **SEO-Optimized URL Structure:** Hierarchical URLs with unlimited category nesting, dynamic catch-all routes, and JSON-LD structured data.
    -   **State Management:** React Query (TanStack Query v5) for efficient server state management and SSR support.
    -   **Authentication System:** Email/Password and Google OAuth with PostgreSQL session storage, email verification, welcome bonuses, referral tracking, account linking, and OTP-based password management.
    -   **Coin Economy ("Sweets"):** Virtual currency with transaction history, expiration management, fraud prevention, earning/spending mechanics, and an XP/Rank system.
    -   **Retention & Monitoring:** Retention Dashboard with loyalty tiers, badges, AI nudges, abandonment emails, and an Error Tracking & Monitoring System.
    -   **AI Integration:** Gemini AI for SEO content suggestions and bot engagement.
    -   **Messaging System:** Comprehensive private messaging with attachments, reactions, read receipts, typing indicators, full-text search, moderation, and real-time WebSocket updates.
    -   **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email) and real-time updates.
    -   **Feature Flag System:** Enterprise-grade feature flags for controlled rollouts, including tri-state status, in-memory caching, "Coming Soon" pages, and admin dashboard controls.
    -   **Admin Dashboards:** Real-time analytics, user/marketplace/content management, security, communications, support, and audit logging.
    -   **Operational Automation:** Critical cron jobs for coin expiration, fraud detection, treasury snapshots, balance reconciliation, error cleanup, coin health monitoring, and error growth monitoring.
    -   **Rich Text Editor:** Enhanced TipTap editor with inline image insertion, drag & drop, and paste from clipboard.
    -   **EA Publishing System:** A complete Expert Advisor marketplace with a multi-step publishing form, secure file uploads, preview functionality, SEO optimization, and download management.
    -   **Search System:** Global omnisearch across threads, users, marketplace, brokers, with real-time autocomplete, advanced filtering, and optimized performance.
    -   **Members System:** Member directory with individual profiles, statistics, badges, search, filter, and a secure follow system.
    -   **Autoscale Deployment Architecture:** Lightweight Express app for immediate health checks and asynchronous loading of the full application to ensure rapid port binding and health check compliance in production.
    -   **Build & Deployment Architecture:** Route group structure (`(public)`, `(app-shell)`), build-safe auth fetching, SSR-safe fetch layer for data fetching during builds, and consistent `@` aliases for import paths.

## External Dependencies

-   **Core Infrastructure:** Neon PostgreSQL (serverless database), Cloudflare R2 (object storage), Replit OIDC (OAuth authentication provider).
-   **Email Services:** Hostinger SMTP (transactional email delivery).
-   **Analytics & SEO:** Google Tag Manager, Google Analytics 4, Google Search Console, Bing Webmaster Tools, Yandex Webmaster, Google PageSpeed Insights API, Gemini AI.
-   **Development Tools:** Drizzle Kit, TypeScript, shadcn/ui, TailwindCSS, Recharts, Zod, Vitest, Supertest, socket.io & socket.io-client.
-   **Build & Deployment:** Next.js 16, esbuild, Docker.
## Recent Changes

### Next.js 16 Deployment Fixes - Autoscale Ready (November 16, 2025)

**Overview**: Comprehensive fixes applied to resolve deployment failure caused by React hooks errors during static page generation. All suggested deployment fixes have been implemented.

**Deployment Error Fixed**: 
```
TypeError: Cannot read properties of null (reading 'useContext') on /_global-error page
React hydration/SSR error during static page generation
Build process exited with code 1
```

**All Deployment Fixes Applied**:

1. **✅ Global Dynamic Rendering (Prevents Static Generation)**
   - Added `export const dynamic = 'force-dynamic'` to root layout and public layout
   - Forces all pages to use dynamic rendering instead of static generation
   - **Files**: `app/layout.tsx`, `app/(public)/layout.tsx`

2. **✅ Fixed global-error.tsx to Avoid React Hooks During SSR**
   - Removed `useEffect` hook that was causing "Cannot read properties of null (reading 'useContext')" error
   - Replaced with conditional `window` check to prevent SSR issues
   - **File**: `app/global-error.tsx`

3. **✅ Set NODE_ENV=production in Build Command**
   - Updated package.json build script to explicitly set `NODE_ENV=production`
   - Eliminates "non-standard NODE_ENV" warnings during build
   - **File**: `package.json` - build script now includes `NODE_ENV=production`

4. **✅ Updated Deployment Configuration for Autoscale**
   - Configured deployment target as `autoscale` with proper NODE_ENV
   - Build command: `NODE_ENV=production npm run build`
   - Run command: `NODE_ENV=production npm run start`
   - **Tool**: deploy_config_tool (Replit deployment configuration)

5. **✅ Next.js Configuration Cleanup**
   - Removed invalid experimental option `dynamicIO` (not supported in Next.js 16)
   - Removed deprecated `skipMiddlewareUrlNormalize` option
   - Kept minimal configuration to prevent build-time static generation
   - **File**: `next.config.js`

**Previous SSR/SSG Fixes (Still Active)**:

6. **FAQSchema SSR Fix**
   - Removed `window.location.href` reference causing SSR errors
   - **Files**: `app/components/SEOSchema.tsx`, `app/(public)/mt4-vs-mt5/page.tsx`

7. **Static Generation Disabled for Dynamic Routes**
   - Disabled `generateStaticParams` to prevent Express API calls during build
   - **Files**: `app/(public)/category/[slug]/page.tsx`

**Deployment Checklist**:
- ✅ NODE_ENV set to 'production' in build and run commands
- ✅ All pages use dynamic rendering (no static generation)
- ✅ React hooks removed from error boundaries
- ✅ Autoscale deployment target configured
- ✅ No invalid Next.js experimental options
- ✅ SSR-safe components (no window/document references)

**Ready for Production Deployment** 🚀

### Production CORS Fix - Published Deployment Working (November 16, 2025)

**Overview**: Fixed CORS configuration in Express server to allow published deployment URLs with port numbers.

**Production Error Fixed**: 
```
CORS: Origin not allowed: https://[deployment-id].riker.replit.dev:3000
Internal Server Error on published deployment link
```

**Root Cause**:
- The CORS regex patterns in `server/index.ts` were checking for Replit domains ending with `.replit.dev`, `.replit.app`, etc.
- Published deployments include a port number (`:3000`) in the origin header
- Patterns like `/^https?:\/\/.*\.replit\.dev$/` failed to match `https://xxx.replit.dev:3000` because the port broke the pattern

**Fix Applied**:
- Updated all Replit domain regex patterns to include optional port numbers: `(:\d+)?`
- **File**: `server/index.ts` (lines 77-84)

**Updated Patterns**:
```javascript
const replitDomainPatterns = [
  /^https?:\/\/.*\.replit\.app(:\d+)?$/,      // Allow optional port
  /^https?:\/\/.*\.replit\.dev(:\d+)?$/,      // Allow optional port
  /^https?:\/\/.*\.repl\.co(:\d+)?$/,         // Allow optional port
  /^https?:\/\/.*\.repl\.run(:\d+)?$/,        // Allow optional port
];
```

**Verification**:
- ✅ No more CORS errors in logs
- ✅ API requests returning 200 status codes
- ✅ Published deployment now works correctly

**Deployment Status**: Production CORS issue resolved - published link should now work without errors! 🚀
