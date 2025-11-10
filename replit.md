# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders, featuring forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to foster a self-sustaining ecosystem by rewarding user contributions and providing valuable trading tools and resources, ultimately becoming a leading hub for forex traders. It empowers traders with community support and essential resources for market navigation.

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
   - Document all fixes in the task list
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

### November 10, 2025

- **✅ COMPLETED: Fixed Dashboard Hydration Error**
  - **What Changed:** Fixed React error #418 (hydration mismatch) on /dashboard page
  - **Root Cause:** Server-side rendering without authentication vs client-side rendering with authentication caused HTML mismatch
  - **Frontend Changes (app/dashboard/page.tsx):**
    - Added `export const dynamic = 'force-dynamic'` to disable static generation (line 3)
    - Forces page to render dynamically on every request, preventing hydration mismatch
    - DashboardClient component now consistently handles authentication flow
  - **Bug Fixes:**
    - ✅ No more React error #418 in browser console
    - ✅ Dashboard loads cleanly for both authenticated and unauthenticated users
    - ✅ Login prompt displays correctly without hydration errors
  - **Status:** Tested and working, console logs clean

- **✅ COMPLETED: Fixed Next.js Deployment Build Failures**
  - **What Changed:** Fixed build failures caused by API connection errors and missing Suspense boundaries
  - **Root Cause:** Pages tried to fetch from Express API during build, but API server not running; useSearchParams() not wrapped in Suspense
  - **Frontend Changes:**
    - **app/lib/api-config.ts:** Added build-time detection using `NEXT_PHASE` environment variable
      - `isBuildTime()` function detects when code runs during build phase
      - `validateEnv()` logs warnings instead of throwing errors during build
      - `getInternalApiUrl()` returns fallback URL during build instead of crashing
    - **Dynamic Rendering Added (`export const dynamic = 'force-dynamic'`):**
      - app/page.tsx (homepage with stats/threads/categories)
      - app/categories/page.tsx
      - app/discussions/page.tsx
      - app/marketplace/page.tsx
      - app/members/page.tsx
    - **API Configuration Fixes:**
      - app/categories/page.tsx - replaced hardcoded EXPRESS_URL with getInternalApiUrl()
      - app/settings/page.tsx - replaced hardcoded EXPRESS_URL with getInternalApiUrl()
      - app/withdrawals/page.tsx - replaced NEXT_PUBLIC_EXPRESS_URL with getInternalApiUrl()
    - **Suspense Boundary Fix (app/verify-email):**
      - Created app/verify-email/VerifyEmailClient.tsx as client component with useSearchParams()
      - Updated app/verify-email/page.tsx to wrap client component in Suspense with loading fallback
      - Added `export const dynamic = 'force-dynamic'` to prevent static generation
  - **Build Results:**
    - ✅ Build compiled successfully in 39.3s
    - ✅ Generated 133/133 pages without errors
    - ✅ No ECONNREFUSED errors during build
    - ✅ No prerender errors for useSearchParams()
    - ✅ All API-dependent pages properly marked as dynamic (ƒ symbol in build output)
  - **Status:** Architect-approved, deployment-ready, tested and working

- **✅ COMPLETED: Fixed React Infinite Loop on /discussions/new**
  - **What Changed:** Fixed "Maximum update depth exceeded" error on thread creation page
  - **Root Cause:** `useEffect` hook had `setValue` from react-hook-form in dependency array, causing infinite re-renders
  - **Frontend Changes (app/discussions/new/EnhancedThreadComposeClient.tsx):**
    - Removed `setValue` from useEffect dependencies (line 1182)
    - `setValue` is stable from react-hook-form and doesn't need to be a dependency
    - Only `editor` instance remains in dependency array
    - Added comment explaining the fix and ESLint disable for exhaustive-deps
  - **Bug Fixes:**
    - Page now loads without infinite loop error
    - Editor-form synchronization still works correctly
    - TipTap editor update events properly sync to form values
  - **Status:** Architect-approved, tested and working

- **✅ COMPLETED: Fixed "Sell Your EA" Button Navigation**
  - **What Changed:** Fixed marketplace button that redirected to non-existent page
  - **Frontend Changes (app/marketplace/MarketplaceEnhanced.tsx):**
    - Updated Link href from `/publish` to `/marketplace/publish` (line 550)
    - Added `data-testid="button-sell-ea"` for testing
  - **Status:** Button now correctly navigates to EA publishing form

- **✅ COMPLETED: Marketplace UI Enhancements**
  - **What Changed:** Fixed overlapping buttons and made EA card images clickable
  - **Frontend Changes (app/marketplace/MarketplaceEnhanced.tsx):**
    - **Grid View (lines 464-476):** Wrapped EA images in Link components with `group-hover:scale-105` effect
    - **List View (lines 367-379):** Wrapped EA images in Link components with `group-hover:opacity-90` effect
    - **Button Spacing Fix:** Added `gap-3` to CardFooter in both views (lines 439, 518)
    - All images now navigate to `/ea/{slug}` when clicked
    - Added `cursor-pointer` class and hover effects for better UX
    - Added `data-testid` attributes for both images and Buy buttons
  - **Bug Fixes:**
    - Fixed overlapping price display and Buy buttons on EA cards
    - Fixed z-index for Heart (favorite) button to stay above clickable image layer
  - **Status:** Architect-approved, responsive design maintained for both grid and list views

- **✅ COMPLETED: Fixed `/ea/undefined` Navigation Bug**
  - **What Changed:** Fixed redirect after EA publishing to use correct response structure
  - **Frontend Changes (app/marketplace/publish/PublishEAMultiStepClient.tsx):**
    - Updated line 679 to access `data.content.slug` instead of `data.slug`
    - API returns `{ success: true, content: { id, slug, ... } }` structure
    - Now correctly navigates to `/ea/{slug}` after successful EA publishing
  - **Status:** Bug fixed, tested and working

## System Architecture

YoForex employs a hybrid frontend built with Next.js and a robust Express.js backend, leveraging PostgreSQL for data persistence.

### Hybrid Frontend Architecture
- **Next.js:** Utilizes App Router, Server Components, and Incremental Static Regeneration (ISR) for the primary user-facing application.
- **Express API:** Provides RESTful endpoints, Replit OIDC authentication, rate limiting, and input validation. React Query manages client-side state and caching.
- **UI/UX:** Modern design with vibrant gradients, glassmorphism, bright product cards with hover effects, color-coded category badges, gradient pricing badges, shimmer loading skeletons, star ratings, and smooth micro-animations.
- **Authentication Pattern:** Client-side authentication checks preferred over server-side for better UX; uses `isLoading`, `isAuthenticated`, and `useAuthPrompt()` pattern with three-state rendering (loading → unauthenticated prompt → authenticated content)

### Database Design
- **PostgreSQL with Drizzle ORM:** Features 25+ tables, critical indexes, connection pooling, SSL/TLS, and automatic retry logic, ensuring data integrity and performance.

### System Design Choices
- **SEO-Optimized URL Structure:** Supports hierarchical URLs with unlimited category nesting and dynamic catch-all routes, with implemented JSON-LD structured data.
- **State Management:** React Query (TanStack Query v5) for efficient server state management and SSR support.
- **Authentication System:** Email/Password and Google OAuth with PostgreSQL session storage, email verification, welcome bonuses, referral tracking, and account linking.
- **Coin Economy ("Sweets"):** A virtual currency system with transaction history, expiration management, fraud prevention, earning/spending mechanics, an XP/Rank system, and administrative controls.
- **Retention & Monitoring:** Includes a Retention Dashboard with loyalty tiers, badges, AI nudges, abandonment emails, and an Error Tracking & Monitoring System.
- **AI Integration:** Gemini AI for SEO content suggestions and bot engagement.
- **Messaging System:** Comprehensive private messaging with attachments, reactions, read receipts, typing indicators, full-text search, and moderation, with real-time updates via WebSocket.
- **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email), supporting various notification types and real-time updates.
- **Feature Flag System:** Enterprise-grade feature flags for controlled rollouts, including tri-state status, in-memory caching, "Coming Soon" pages, and admin dashboard controls.
- **Admin Dashboards:** Real-time analytics, user/marketplace/content management, security, communications, support, and audit logging.
- **Operational Automation:** Critical cron jobs for coin expiration, fraud detection, treasury snapshots, and balance reconciliation.
- **Rich Text Editor:** Enhanced TipTap editor with inline image insertion, drag & drop, and paste from clipboard.
- **EA Publishing System:** A complete Expert Advisor marketplace with a multi-step publishing form, secure file uploads, secure Object Storage, preview functionality, SEO optimization, and download management.
- **Search System:** Global omnisearch across threads, users, marketplace, brokers, with real-time autocomplete, advanced filtering, and optimized performance.
- **Members System:** Member directory with individual profiles, statistics, badges, search, filter, and a secure follow system.

## External Dependencies

### Core Infrastructure
- **Neon PostgreSQL:** Serverless database.
- **Replit Object Storage:** Persistent file storage.
- **Replit OIDC:** OAuth authentication provider.

### Email Services
- **Hostinger SMTP:** Transactional email delivery.

### Analytics & SEO
- **Google Tag Manager:** Tag management.
- **Google Analytics 4:** User tracking.
- **Google Search Console, Bing Webmaster Tools, Yandex Webmaster:** SEO monitoring.
- **Google PageSpeed Insights API:** Performance monitoring.
- **Gemini AI:** AI-powered content suggestions and bot engagement.

### CDN & Storage
- **Google Cloud Storage:** Object storage backend.

### Development Tools
- **Drizzle Kit:** Database migrations.
- **TypeScript:** Type safety.
- **shadcn/ui:** Component library.
- **TailwindCSS:** Utility-first CSS framework.
- **Recharts:** Composable charting library for React.
- **Zod:** Runtime schema validation.
- **Vitest:** Testing framework.
- **Supertest:** API integration testing.
- **socket.io & socket.io-client:** WebSocket communication.

### Build & Deployment
- **Next.js 16:** React framework.
- **esbuild:** Express API bundling.
- **Docker:** Containerization.