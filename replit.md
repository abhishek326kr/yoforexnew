# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders, offering forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to create a self-sustaining ecosystem by rewarding user contributions, providing valuable trading tools, and becoming a leading hub for forex traders, empowering them with community support and essential market navigation resources. The business vision is to establish a self-sustaining platform with significant market potential by fostering community, providing valuable resources, and enhancing trading experiences for forex enthusiasts.

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

## Recent Changes

### File Upload Error Handling Fix (Nov 14, 2025)
**✅ COMPLETED** - Fixed critical "Unexpected field" error on /api/upload endpoint

**Problem:**
- Users encountered 500 error: "Unexpected field" when uploading files in discussions
- Error occurred when multer encountered issues before route handler could process
- No helpful error messages to guide users

**Root Cause:**
- Multer errors (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, LIMIT_UNEXPECTED_FILE) were not properly caught
- Errors threw before route handler execution, resulting in generic 500 responses
- Missing error handling middleware for multer-specific errors

**Solution Implemented:**
1. **Wrapped multer middleware** in custom error handler:
   - Catches all multer errors before route handler
   - Provides specific error messages for each error type
   - Logs detailed error information for debugging

2. **Specific Error Messages** for common cases:
   - `LIMIT_FILE_SIZE`: "File too large. Maximum size is 10MB per file."
   - `LIMIT_FILE_COUNT`: "Too many files. Maximum 10 files allowed."
   - `LIMIT_UNEXPECTED_FILE`: "Unexpected file field. Please use 'files' as the field name."
   - File filter rejections: Returns the specific rejection reason

3. **Improved Error Logging**:
   - All multer errors logged with `[Upload] Multer error:` prefix
   - Helps diagnose file upload issues in production

**Files Modified:**
- `server/routes.ts` - Added comprehensive multer error handling to /api/upload endpoint

**Verification:**
- ✅ Server running successfully with new error handling
- ✅ Proper error responses for file size limits
- ✅ Clear error messages guide users on how to fix issues
- ✅ Detailed logging for production debugging

### EA Detail Page UI & Security Improvements (Nov 14, 2025)
**✅ COMPLETED** - Beautiful modern download UI with responsive design and critical security fix

**Features Implemented:**
1. **EADownloadCard Component** - Modern, beautiful download box featuring:
   - Gradient header with coin price badge
   - File details display (name, size, format, download count)
   - Benefits section highlighting instant download, secure payment, and lifetime access
   - Proper authentication and coin balance validation
   - Free vs paid EA handling

2. **Critical Security Fix** - Prevented paid downloads without sufficient coins:
   - Implemented correct guard: `if (!ea.isFree && !hasEnoughCoins)` 
   - Blocks paid downloads when user lacks sufficient coin balance
   - Shows helpful error message and redirects to recharge page

3. **Responsive Mobile-First Design**:
   - Left discovery sidebar hidden on mobile (visible on desktop via `lg:block`)
   - Responsive padding throughout (`p-4 lg:p-6`)
   - Responsive text sizes (`text-xl sm:text-2xl md:text-4xl`)
   - Grid layout adapts to screen size (`lg:grid-cols-12`)
   - Stats and badges wrap properly on small screens

4. **EA Interface Extended** - Added file metadata fields:
   - `fileName` - Original file name
   - `fileSize` - File size in bytes
   - `downloadPoints` - Points earned per download

5. **Code Quality** - Centralized download logic and cleaned up:
   - All download handling moved to EADownloadCard component
   - Removed duplicate purchase/download code from EADetailClient
   - Cleaned up unused imports and interfaces

**Files Modified:**
- `app/ea/[slug]/components/EADownloadCard.tsx` - New component with modern UI
- `app/ea/[slug]/EADetailClient.tsx` - Responsive layout, removed duplicate logic
- `app/ea/[slug]/page.tsx` - Extended EA interface with metadata

**Verification:**
- ✅ Beautiful modern download box rendering perfectly
- ✅ Responsive design works on mobile and desktop
- ✅ Security guard prevents unpaid downloads
- ✅ Authentication flow works correctly (login prompt for guests)
- ✅ Coin balance display and validation working
- ✅ No TypeScript or runtime errors

### Production Site Failure Fix (Nov 12, 2025)
**✅ RESOLVED** - Complete production site failure where everything showed skeleton boxes

**Root Causes Identified & Fixed:**
1. **CSP Blocking Next.js Scripts** - Express was applying strict CSP (`script-src 'self'`) globally, blocking Next.js inline scripts required for hydration
   - **Fix**: Disabled global CSP in `server/middleware/securityHeaders.ts`, only apply strict CSP to `/api/*` routes
   
2. **Architecture Misconfiguration** - Next.js running on port 5000 but Express proxying to port 3000
   - **Fix**: Reconfigured `start-hybrid.sh` so Next.js runs on port 3000 (internal) and Express on port 5000 (user-facing)
   
3. **AppProviders Timeout** - Auth fetch causing production hangs
   - **Fix**: Added 3-second AbortController timeout to `app/components/providers/AppProviders.tsx`
   
4. **Infinite Render Loop** - `useSearchParams()` in dependency array of MarketplaceEnhanced
   - **Fix**: Removed problematic `useSearchParams` hook and URL sync effect from `app/marketplace/MarketplaceEnhanced.tsx`

**Files Modified:**
- `server/middleware/securityHeaders.ts` - Disabled global CSP, strict CSP only on API routes
- `start-hybrid.sh` - Fixed port architecture (Next.js:3000 internal, Express:5000 user-facing)
- `app/components/providers/AppProviders.tsx` - Added auth fetch timeout
- `app/marketplace/MarketplaceEnhanced.tsx` - Removed useSearchParams dependency issue

**Verification:**
- Homepage: ✅ Rendering perfectly
- Marketplace: ✅ Data loading (39 items, isLoading: false confirmed in logs)
- API: ✅ All endpoints returning 200 OK
- CSP: ✅ No longer blocking inline scripts

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
    **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email) and real-time updates.
    -   **Feature Flag System:** Enterprise-grade feature flags for controlled rollouts, including tri-state status, in-memory caching, "Coming Soon" pages, and admin dashboard controls.
    -   **Admin Dashboards:** Real-time analytics, user/marketplace/content management, security, communications, support, and audit logging.
    -   **Operational Automation:** Critical cron jobs for coin expiration, fraud detection, treasury snapshots, balance reconciliation, error cleanup, coin health monitoring, and error growth monitoring.
    -   **Rich Text Editor:** Enhanced TipTap editor with inline image insertion, drag & drop, and paste from clipboard.
    -   **EA Publishing System:** A complete Expert Advisor marketplace with a multi-step publishing form, secure file uploads, preview functionality, SEO optimization, and download management.
    -   **Search System:** Global omnisearch across threads, users, marketplace, brokers, with real-time autocomplete, advanced filtering, and optimized performance.
    -   **Members System:** Member directory with individual profiles, statistics, badges, search, filter, and a secure follow system.
    -   **Autoscale Deployment Architecture:** Lightweight Express app for immediate health checks and asynchronous loading of the full application to ensure rapid port binding and health check compliance in production.

## External Dependencies

-   **Core Infrastructure:** Neon PostgreSQL (serverless database), Replit Object Storage (persistent file storage), Replit OIDC (OAuth authentication provider).
-   **Email Services:** Hostinger SMTP (transactional email delivery).
-   **Analytics & SEO:** Google Tag Manager, Google Analytics 4, Google Search Console, Bing Webmaster Tools, Yandex Webmaster, Google PageSpeed Insights API, Gemini AI.
-   **CDN & Storage:** Google Cloud Storage.
-   **Development Tools:** Drizzle Kit, TypeScript, shadcn/ui, TailwindCSS, Recharts, Zod, Vitest, Supertest, socket.io & socket.io-client.
-   **Build & Deployment:** Next.js 16, esbuild, Docker.