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

## Recent Changes

### November 10, 2025 - TipTap SSR Hydration Error Fixed (Final Solution)
**Issue:** TipTap editor on `/discussions/new` page was causing React error #185 due to SSR hydration mismatch. TipTap's `useEditor` hook executes during server-side rendering in Next.js App Router, even with conditional guards.

**Root Cause:** In Next.js App Router, React hooks (including `useEditor`) ALWAYS execute during SSR, regardless of conditional logic or `isMounted` patterns. The `isMounted` pattern doesn't prevent hook execution during SSR - it only affects what the hook returns.

**Solution Implemented:**
1. Created `RichTextEditorClient.tsx` - encapsulates all TipTap editor logic in a client-only component
2. Modified `EnhancedThreadComposeClient.tsx`:
   - Added dynamic import with `{ ssr: false }` to completely isolate TipTap from SSR
   - Removed all TipTap-related code (FormattingToolbar, useEditor, handleImageUpload, editor state)
   - Replaced old editor rendering with dynamically imported `<RichTextEditorClient>`
   - Updated form integration to use onUpdate callbacks for persisting content
   - Updated character counter, SEO panel, and preview to use form values instead of editor instance

**Files Created/Modified:**
- `app/discussions/new/RichTextEditorClient.tsx`: New client-only TipTap editor component
- `app/discussions/new/EnhancedThreadComposeClient.tsx`: Refactored to use dynamic import

**Testing:**
- ✅ Page loads without TipTap SSR errors
- ✅ No React error #185 (hydration mismatch eliminated)
- ✅ Application builds and runs successfully
- ✅ Fast Refresh working correctly
- ✅ Only expected 401 authentication error for unauthenticated users
- ✅ Form validation, draft saving, and content persistence all working
- ✅ Architect reviewed and approved (PASS)

**Pattern for Future Use:**
For client-only libraries in Next.js App Router, use dynamic imports with `{ ssr: false }`:
```tsx
const ClientComponent = dynamic(
  () => import('./ClientComponent').then(mod => ({ default: mod.ClientComponent })),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);
```

**CRITICAL:** The `isMounted` pattern does NOT prevent hook execution during SSR. Only dynamic imports with `{ ssr: false }` can completely isolate client-only code from server-side rendering.

### November 10, 2025 - Infinite Loop Error in CoinBalanceWidget Fixed
**Issue:** "Maximum update depth exceeded" error occurring when clicking "Next" button on `/discussions/new` page. The error was caused by nested TooltipProvider components triggering infinite re-renders.

**Root Cause:** CoinBalanceWidget was creating its own TooltipProvider wrapper around the Tooltip component, while AppProviders already provides a global TooltipProvider at the root level. Nested TooltipProviders can cause React to enter infinite re-render loops.

**Solution Implemented:**
- Removed TooltipProvider wrapper from CoinBalanceWidget component
- Kept only Tooltip, TooltipTrigger, and TooltipContent components
- Relied on the global TooltipProvider from AppProviders.tsx

**Files Modified:**
- `app/components/CoinBalanceWidget.tsx`: Removed nested TooltipProvider

**Testing:**
- ✅ Page loads successfully without infinite loop errors
- ✅ No "Maximum update depth exceeded" errors
- ✅ Next button works correctly
- ✅ Tooltip functionality preserved

**Pattern for Future Use:**
shadcn/ui TooltipProvider should only be used ONCE at the root level (in AppProviders). Individual components should only use Tooltip, TooltipTrigger, and TooltipContent without wrapping them in their own TooltipProvider.