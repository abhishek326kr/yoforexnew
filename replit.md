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
    -   **Error Handling Infrastructure:** Comprehensive error handling with structured logging, error categorization (6 types), severity levels (4 levels), context-aware logging with sensitive data sanitization, user-friendly messages, and transaction safety for critical operations.

## External Dependencies

-   **Core Infrastructure:** Neon PostgreSQL (serverless database), Cloudflare R2 (object storage), Replit OIDC (OAuth authentication provider).
-   **Email Services:** Hostinger SMTP (transactional email delivery).
-   **Analytics & SEO:** Google Tag Manager, Google Analytics 4, Google Search Console, Bing Webmaster Tools, Yandex Webmaster, Google PageSpeed Insights API, Gemini AI.
-   **Development Tools:** Drizzle Kit, TypeScript, shadcn/ui, TailwindCSS, Recharts, Zod, Vitest, Supertest, socket.io & socket.io-client.
-   **Build & Deployment:** Next.js 16, esbuild, Docker.

## Recent Changes

### Bug Fixes - COMPLETE (November 17, 2025)

#### 1. URL-Based Step Navigation for Thread Creation Wizard

**Goal**: Implement URL parameter-based navigation for the thread creation wizard so that the current step is reflected in the URL and browser back/forward buttons work properly.

**Component**: `app/(app-shell)/discussions/new/EnhancedThreadComposeClient.tsx` (actively used component on `/discussions/new`)

**Implementation**:

1. **Server-Safe State Initialization**:
   - `currentStep` always initialized to 1 (line 798) to prevent hydration mismatches
   - Server and client render identical initial state
   - URL parameter reading deferred to client-side useEffect

2. **URL Navigation Function** (lines 964-977):
   - `navigateToStep(step)` validates step range (1-3) and updates URL
   - Preserves existing query parameters (e.g., category)
   - Uses `router.push()` with `scroll: false` to create new history entries
   - Updates URL as `/discussions/new?step=X` or `/discussions/new?category=Y&step=X`

3. **URL Sync Effect** (lines 981-1001):
   - On initial load, if no `?step` parameter exists, uses `router.replace()` to add `?step=1`
   - `router.replace()` overwrites history entry (prevents back-button trap)
   - Monitors `searchParams` changes for browser back/forward navigation
   - Syncs URL step parameter to `currentStep` state
   - Validates step range (1-3) to ensure safety

4. **Navigation Integration**:
   - `handleStepClick()` delegates to `navigateToStep()` for backward navigation
   - Previous/Next buttons call `navigateToStep()` to update URL
   - Step indicator pills use `handleStepClick()` for direct navigation

**Technical Details**:
- Hydration-safe: Server always renders step 1, client updates via useEffect
- Category parameter preserved during step navigation
- Step validation clamps to 1-3 range in multiple places
- Browser history fully integrated (back/forward works correctly)
- No back-button trap: Initial URL normalization uses `replace`, user navigation uses `push`

**Benefits**:
- Browser back/forward buttons work correctly
- Direct linking to specific steps (e.g., `/discussions/new?step=3`)
- Shareable URLs with preserved state
- No hydration mismatch errors
- Better UX with browser history integration

#### 2. AuthUpdater Infinite Loop Fix

**Issue**: "Maximum update depth exceeded" error caused by infinite render loop in AuthUpdater component.

**Root Cause**: 
- `AppShellLayout` (Server Component) fetches `initialUser` on every render
- Each render creates a new object reference for `initialUser`, even if user data is identical
- `AuthUpdater`'s useEffect triggered on every reference change
- Calling `queryClient.setQueryData()` caused re-renders, creating infinite loop

**Component**: `app/components/providers/AuthUpdater.tsx`

**Solution**:
- Added `useRef` to track whether initial user data has been set
- useEffect only sets query data once on mount, preventing repeated updates
- Prevents infinite loop while maintaining proper initial auth state hydration

**Code Change** (line 19):
```typescript
const hasSetInitialUser = useRef(false);

useEffect(() => {
  // Only set initial user once to avoid infinite loops
  if (initialUser && !hasSetInitialUser.current) {
    queryClient.setQueryData(["/api/me"], initialUser);
    hasSetInitialUser.current = true;
  }
}, [initialUser, queryClient]);
```

**Verification**:
- Browser console shows only normal HMR messages
- No "Maximum update depth exceeded" errors
- Auth state properly hydrates from server on page load

#### 3. CoinBalanceWidget Nested TooltipProvider Fix

**Issue**: "Maximum update depth exceeded" error caused by nested `TooltipProvider` in the `CoinBalanceWidget` component.

**Root Cause**:
- `TooltipProvider` is already defined at app root level in `RootProviders.tsx`
- `CoinBalanceWidget` was creating its own `TooltipProvider` around a single `Tooltip`
- Nested providers caused React state management conflicts, leading to infinite re-renders

**Component**: `app/components/CoinBalanceWidget.tsx`

**Solution**:
- Removed the nested `TooltipProvider` wrapper from `CoinBalanceWidget`
- Individual `Tooltip` components now use the existing provider from app root
- Changed wrapper from `<TooltipProvider>...</TooltipProvider>` to `<>...</>`

**Code Change** (lines 59-92):
```typescript
// Before: Nested TooltipProvider causing infinite loop
return (
  <TooltipProvider>
    <Tooltip>...</Tooltip>
    <TransactionHistoryDrawer />
  </TooltipProvider>
);

// After: Using root-level TooltipProvider
return (
  <>
    <Tooltip>...</Tooltip>
    <TransactionHistoryDrawer />
  </>
);
```

**Verification**:
- Browser console shows only HMR messages: `[Fast Refresh] done`, `[HMR] connected`
- No "Maximum update depth exceeded" errors
- No repeated setState() calls
- Tooltip functionality works correctly with root-level provider