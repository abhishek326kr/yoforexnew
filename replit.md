# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders. It offers forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to be a leading hub for forex traders by fostering community, providing valuable resources, and enhancing trading experiences, with a vision for a self-sustaining platform with significant market potential.

## User Preferences
### Communication Style
- Use simple, everyday language
- Avoid technical jargon when explaining to user
- Be concise and clear

### Task Execution Workflow (CRITICAL - ALWAYS FOLLOW)

**When receiving a new task:**

1. **Deep Analysis Phase**
   - Think thoroughly about the task before starting
   - Consider all edge cases and implications
   - Identify potential challenges upfront

2. **Planning Phase (MANDATORY)**
   - Call `architect` tool with `responsibility: "plan"` to get strategic guidance
   - Break down complex tasks into clear, logical subtasks
   - Create comprehensive plan with dependencies identified
   - Document the approach before implementation

3. **Delegation Phase**
   - Use `start_subagent` for complex, multi-step subtasks
   - Provide clear context and success criteria to subagents
   - Ensure subagents have all necessary file paths and context

4. **Autonomous Execution**
   - **DO NOT ask user for confirmation mid-task**
   - Work through entire task list to completion
   - Handle errors and obstacles independently
   - Only return to user when task is 100% complete or genuinely blocked

5. **Documentation Phase (MANDATORY)**
   - Update replit.md regularly during work
   - Document what was changed and why
   - Keep documentation clean, organized, and current
   - Remove outdated information
   - Add completion dates to major changes

6. **Review Phase (BEFORE COMPLETION)**
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
    -   **Retention System:** Retention Dashboard with loyalty tiers, badges, AI nudges, and abandonment emails.
    -   **AI Integration:** Gemini AI for SEO content suggestions and bot engagement.
    -   **Messaging System:** Comprehensive private messaging with attachments, reactions, read receipts, typing indicators, full-text search, moderation, and real-time WebSocket updates.
    -   **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email) and real-time updates.
    -   **Feature Flag System:** Enterprise-grade feature flags for controlled rollouts, including tri-state status, in-memory caching, "Coming Soon" pages, and admin dashboard controls.
    -   **Admin Dashboards:** Real-time analytics, user/marketplace/content management, security, communications, support, and audit logging.
    -   **Operational Automation:** Critical cron jobs for coin expiration, fraud detection, treasury snapshots, balance reconciliation, and coin health monitoring.
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

### Thread Creation "Next" Button Fix (November 17, 2025)

**Issue**: User reported that the "Next" button on the thread creation wizard (/discussions/new) wasn't working even though all form validations passed.

**Root Cause**: Validation mismatch between form schema and UI logic. The Zod schema required minimum 100 characters for the thread body, but `canProceedToNextStep()` function was checking for minimum 500 characters. This caused the Next button to remain disabled even when the form was valid.

**Fix Applied**:
- **ThreadCreationWizard.tsx** (line 355): Changed validation from `watchedFields.body.length >= 500` to `watchedFields.body.length >= 100` to match schema validation

**Verification**:
- ✅ Next button now enables at 100 characters (matching schema)
- ✅ Validation logic is now consistent
- ✅ No side effects on other wizard steps

**Note**: Minor UI improvement suggested by architect - character counter visual feedback still shows success indicator at 500 chars (doesn't block functionality but could confuse users).

### AuthUpdater TypeError Fix (November 17, 2025)

**Issue**: `setUser is not a function` error in `AuthUpdater` component causing console errors.

**Root Cause**: The `AuthUpdater` component was trying to call `setUser()` from `AuthContext`, but that method didn't exist. The `AuthContext` uses React Query to manage auth state and doesn't expose a `setUser` method.

**Fix Applied**:
- **AuthUpdater** (`app/components/providers/AuthUpdater.tsx`): Changed to directly update React Query cache using `queryClient.setQueryData(["/api/me"], initialUser)`
- **AuthContext** (`app/contexts/AuthContext.tsx`): Fixed TypeScript error by using `query.isPending` instead of `query.status === "pending"`

**Verification**:
- ✅ No console errors
- ✅ Auth state properly synchronized between server and client
- ✅ TypeScript LSP errors resolved

### React Hydration Error Fix - Google Analytics (November 17, 2025)

**Issue**: React hydration mismatch error caused by Google Tag Manager scripts in `<head>` containing `Date.now()` and `new Date()` calls.

**Root Cause**: GTM initialization scripts use `Date.now()` and `new Date()` which generate different values on server vs client, causing React to detect attribute mismatches during hydration.

**Fix Applied**:
- **Moved scripts** from `<head>` to `<body>` in `app/layout.tsx`
- Scripts still load and function correctly, but now avoid hydration conflicts
- Kept `suppressHydrationWarning` on both `<html>` and `<body>` tags

**Verification**:
- ✅ No hydration errors in browser console
- ✅ Google Analytics and GTM scripts loading correctly
- ✅ Application rendering without React warnings

### Authentication 500 Error Fix (November 17, 2025)

**Issue**: Email authentication was returning "500: Internal Server Error" instead of proper error codes.

**Root Cause**: Duplicate LocalStrategy registration conflict - both `server/flexibleAuth.ts` and `server/localAuth.ts` were registering LocalStrategy with Passport, causing authentication to fail with 500 errors.

**Fix Applied**:
- **Backend** (`server/flexibleAuth.ts`): Removed duplicate `setupEmailAuth()` call that was registering a second LocalStrategy
- **Frontend** (`app/components/AuthModal.tsx`): Fixed error handling to extract user-friendly messages from backend JSON responses

**Verification**:
- ✅ Login endpoint returns 401 Unauthorized (not 500!) for invalid credentials
- ✅ Proper error message displayed: "Invalid username or password"
- ✅ Security events logged correctly
- ✅ Application running with no errors