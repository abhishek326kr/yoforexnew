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

### Complete UI/UX Modernization (Nov 12, 2025)
**✅ COMPLETED** - Comprehensive glassmorphic redesign of entire homepage and navigation

**Project Scope:**
Complete UI/UX modernization of YoForex with stunning glassmorphic design while strictly preserving the existing blue color scheme (217 91% 45-60%). All major components modernized with enhanced animations, depth effects, and improved accessibility.

**Design Foundation Established:**
- Comprehensive spacing tokens (--spacing-xs through --spacing-2xl)
- Glassmorphism utilities (.glass-card, .glass-panel, .glass-subtle, gradients)
- Enhanced shadow system (.card-depth-1, .card-depth-2, .card-depth-3)
- Animation tokens with prefers-reduced-motion support (.animate-slide-up, .animate-fade-in, .animate-pulse-slow)
- Transition utilities (.transition-fast, .transition-smooth, .transition-slow)
- Hover/active utilities (.hover-lift, .hover-elevate, .active-elevate-2)

**Components Modernized:**
1. **Header** - Glassmorphism effect, enhanced search bar, smooth transitions, animated dropdowns
2. **Hero Section** - Gradient background, glassmorphic CTA cards, animated statistics with staggered delays
3. **StatsBar** - Count-up animations (react-countup), shimmer loading effects, depth cards
4. **WeekHighlights** - Smooth tab transitions, comprehensive loading skeletons, staggered thread animations
5. **CategoryTree** - Multi-layer card depth, gradient icon backgrounds, hover lift effects, entry animations
6. **ForumThreadCard** - Enhanced badges, improved spacing, hover effects, visual depth
7. **Sidebar Widgets** (CoinBalance, TrustLevel, Leaderboard) - Glass effects, proper Badge sizing, animations
8. **TopSellers** - Card animations, enhanced loading states, staggered motion, depth effects
9. **Footer** - Enhanced spacing, gradient brand text, smooth link transitions, improved responsive layout

**Design Guidelines Compliance:**
- ✅ No custom Button/Badge hover overrides (all use built-in variants)
- ✅ Proper Badge sizing (no hardcoded heights)
- ✅ All animations respect prefers-reduced-motion
- ✅ Consistent use of design tokens throughout
- ✅ Blue color scheme preserved (217 91% 45-60%)

**Files Modified:**
- `app/globals.css` - Complete design foundation with tokens and utilities
- `app/components/Header.tsx` - Glassmorphism and enhanced interactions
- `app/HomeClient.tsx` - Hero section with gradients and animations
- `app/components/StatsBar.tsx` - Count-up animations and shimmer effects
- `app/components/WeekHighlights.tsx` - Tab system and loading skeletons
- `app/components/CategoryTree.tsx` - Depth cards and gradient icons
- `app/components/ForumThreadCard.tsx` - Enhanced styling and spacing
- `app/components/CoinBalanceWidget.tsx` - Glass effects and proper sizing
- `app/components/TrustLevel.tsx` - Achievement cards with animations
- `app/components/Leaderboard.tsx` - Tab system and user row animations
- `app/components/TopSellers.tsx` - Card animations and enhanced states
- `app/components/Footer.tsx` - Improved spacing and gradient branding

**Verification:**
- ✅ All components rendering correctly
- ✅ No functional regressions
- ✅ All APIs functioning (GET /api/stats, /api/categories, /api/threads, /api/content/top-sellers)
- ✅ Prefers-reduced-motion accessibility maintained
- ✅ Cohesive visual hierarchy achieved
- ✅ Design system consistency verified

**Next Steps:**
- QA cross-browser testing and accessibility validation
- Monitor production telemetry for UI runtime errors
- Plan stakeholder communications showcasing new design

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