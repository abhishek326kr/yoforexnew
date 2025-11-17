# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders, offering forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to be a leading hub by fostering community, providing valuable resources, and enhancing trading experiences, with a vision for a self-sustaining platform with significant market potential.

## User Preferences
### Communication Style
- Use simple, everyday language
- Avoid technical jargon when explaining to user
- Be concise and clear

### Task Execution Workflow (CRITICAL - ALWAYS FOLLOW)

**When receiving a new task:**

1.  **Deep Analysis Phase**
    -   Think thoroughly about the task before starting
    -   Consider all edge cases and implications
    -   Identify potential challenges upfront

2.  **Planning Phase (MANDATORY)**
    -   Call `architect` tool with `responsibility: "plan"` to get strategic guidance
    -   Break down complex tasks into clear, logical subtasks
    -   Create comprehensive plan with dependencies identified
    -   Document the approach before implementation

3.  **Delegation Phase**
    -   Use `start_subagent` for complex, multi-step subtasks
    -   Provide clear context and success criteria to subagents
    -   Ensure subagents have all necessary file paths and context

4.  **Autonomous Execution**
    -   **DO NOT ask user for confirmation mid-task**
    -   Work through entire task list to completion
    -   Handle errors and obstacles independently
    -   Only return to user when task is 100% complete or genuinely blocked

5.  **Documentation Phase (MANDATORY)**
    -   Update replit.md regularly during work
    -   Document what was changed and why
    -   Keep documentation clean, organized, and current
    -   Remove outdated information
    -   Add completion dates to major changes

6.  **Review Phase (BEFORE COMPLETION)**
    -   Call `architect` with `responsibility: "evaluate_task"` to review all work
    -   Fix any issues architect identifies
    -   Only mark tasks complete after architect approval

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
    -   **Autoscale Deployment Architecture:** Lightweight Express app for immediate health checks and asynchronous loading of the full application for rapid port binding and health check compliance in production.
    -   **Build & Deployment Architecture:** Route group structure (`(public)`, `(app-shell)`), build-safe auth fetching, SSR-safe fetch layer for data fetching during builds, and consistent `@` aliases for import paths.
    -   **Error Handling Infrastructure:** Comprehensive error handling with structured logging, error categorization (6 types), severity levels (4 levels), context-aware logging with sensitive data sanitization, user-friendly messages, and transaction safety for critical operations.

## External Dependencies

-   **Core Infrastructure:** Neon PostgreSQL (serverless database), Cloudflare R2 (object storage), Replit OIDC (OAuth authentication provider).
-   **Email Services:** Hostinger SMTP (transactional email delivery).
-   **Analytics & SEO:** Google Tag Manager, Google Analytics 4, Google Search Console, Bing Webmaster Tools, Yandex Webmaster, Google PageSpeed Insights API, Gemini AI.
-   **Development Tools:** Drizzle Kit, TypeScript, shadcn/ui, TailwindCSS, Recharts, Zod, Vitest, Supertest, socket.io & socket.io-client.
-   **Build & Deployment:** Next.js 16, esbuild, Docker.

## Recent Changes (November 2025)

### Thread Creation Wizard - Sequential Step Validation

**Date**: November 17, 2025

**Goal**: Prevent users from skipping ahead to step 2 or 3 without completing previous steps in the thread creation wizard.

**Component**: `app/(app-shell)/discussions/new/EnhancedThreadComposeClient.tsx`

**Implementation**:

1. **Step Progress Tracking**:
   - Added `stepProgress` state to track which steps have been "acknowledged" by clicking Continue
   - Prevents users from accessing steps they haven't reached yet

2. **Validation Helpers**:
   - `isStep1Complete`: Title (≥5 chars), body (≥20 chars), category selected
   - `isStep2Complete`: Step 1 complete + step 2 acknowledged
   - `getMaxAccessibleStep()`: Returns highest step user can access (1, 2, or 3)

3. **Navigation Enforcement**:
   - `navigateToStep(step, bypassValidation)` clamps requested step to max accessible step
   - `bypassValidation` parameter solves async state update issue
   - Users cannot navigate to steps beyond what they've completed

4. **URL Validation**:
   - URL sync effect validates requested step from URL parameter
   - Redirects to max accessible step if user tries to access invalid step
   - Shows toast notification explaining why redirect occurred
   - Uses `router.replace()` to avoid polluting browser history
   - Automatically handles regression when fields are cleared (via `getMaxAccessibleStep` in dependencies)

5. **Step Acknowledgement**:
   - Continue button acknowledges current step before navigating forward
   - Uses `bypassValidation=true` to avoid async state race condition
   - Tracks user progression through the wizard

**Critical Bug Fixes**:

1. **Async State Race Condition** (Lines 993-1021):
   - Problem: `setStepProgress()` followed by `navigateToStep()` caused navigation to use stale state
   - Solution: Added `bypassValidation` parameter to skip validation check when Continue is clicked
   - Continue button sets acknowledgement state AND bypasses validation (line 1566)

2. **Infinite Loop Prevention - First Fix** (November 17, 2025):
   - Problem: Separate regression effect created circular dependency with URL sync effect
   - Both effects tried to manage navigation simultaneously, triggering each other infinitely
   - Solution: Removed redundant regression effect
   - URL sync effect handles all validation scenarios automatically

3. **Infinite Loop Prevention - Final Fix** (November 17, 2025):
   - Problem: `getMaxAccessibleStep` function in URL sync effect's dependency array
   - When form fields changed → new function reference → effect re-runs → router.replace() → Next.js re-renders → new initialUser object → AuthUpdater infinite loop
   - Solution: Inlined max step calculation in URL sync effect
   - Replaced function dependency with underlying state dependencies: `isStep1Complete`, `stepProgress`
   - Breaks the render cycle: form changes → effect runs once → no new router navigation unless step validation actually fails

**Behavior**:
- Step 1 → Step 2: Only allowed after title, body, and category are filled
- Step 2 → Step 3: Only allowed after clicking Continue on step 2
- Direct URL access: `/discussions/new?step=3` automatically redirects to step 1 if incomplete
- Browser back button: Works correctly, respects validation rules
- Field clearing: Automatically redirects back when required fields are cleared on later step

**Verification**:
- ✅ Users cannot skip steps or access steps prematurely
- ✅ Toast notifications inform users why they were redirected
- ✅ Browser navigation (back/forward) respects validation
- ✅ No infinite loops or redirect cycles
- ✅ Continue button advances user through wizard correctly