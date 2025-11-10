# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders. It features forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to foster a self-sustaining ecosystem by rewarding user contributions and providing valuable trading tools and resources, ultimately becoming a leading hub for forex traders. It empowers traders with community support and essential resources for market navigation.

## Recent Changes (Latest First)

### November 7, 2025 - Marketplace Product Images Fix
- **Fixed Marketplace EA Product Images**: Resolved issue where all marketplace products displayed blue placeholder boxes
  - Downloaded 10 category-appropriate stock trading images (scalping, grid, news trading, etc.)
  - Updated database to assign appropriate default images to all 19 products based on categories
  - Set up static file serving in Express backend for stock images
  - Fixed image variable references in MarketplaceEnhanced component
  - Root cause: Products had null image URLs and component had undefined image variables
- **Impact**: Marketplace now displays professional trading-related images for each product

### November 7, 2025 - React Hydration Mismatch Fix
- **Fixed Critical React Hydration Error**: Resolved hydration mismatch causing server/client rendering inconsistencies
  - Added consistent default sorting to `/api/threads` endpoint (pinned first, then by activity)
  - Ensures deterministic thread ordering between SSR and CSR renders
  - Root cause: Non-deterministic thread ordering when no sortBy parameter provided
- **Impact**: Homepage and thread listings now render consistently without hydration errors

### November 7, 2025 - Coin Rewards Fix for Thread Creation  
- **Fixed Critical Coin Rewards Issue**: Resolved issue where users weren't receiving coins when creating forum threads
  - Fixed test trigger name mismatch: Updated from `FORUM_THREAD_CREATE` to `FORUM_THREAD_CREATED` 
  - Added automatic wallet creation in `coinTransactionService.ts` within transactions when wallet doesn't exist
  - Enhanced wallet initialization logic in thread creation endpoint with proper error handling
  - Root cause: Missing user wallets prevented coin transactions from executing
- **Impact**: Users now properly receive 12 coins (10 base + 2 bonus for optional details) when creating threads

### November 7, 2025 - Thread Creation Form Fix (Updated)
- **Fixed Critical React Update Depth Error**: Resolved persistent infinite loop issue preventing thread creation
  - Fixed useEffect dependency issue by extracting stable `setValue` method instead of using entire `form` object
  - Previous fix attempts had addressed TypeScript errors and import naming but core issue remained
  - Root cause: useEffect hook with unstable form object dependency causing re-render loop
- **Impact**: Thread creation form now fully functional without infinite loops, users can successfully create threads

### November 7, 2025 - Authentication Schema Fix
- **Fixed Google Sign-In Critical Error**: Resolved database schema mismatches causing authentication failures
  - Added missing `two_factor_verified_at` timestamp column to users table
  - Added missing `two_factor_method` varchar(20) column to users table  
  - Updated shared/schema.ts to include complete 2FA field definitions
- **Platform Status**: Now fully operational - 895 members, 38 forum threads, 71 replies
- **Impact**: All authentication methods (Google OAuth, Email/Password, Replit OIDC) now functioning correctly

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

### Database Design
- **PostgreSQL with Drizzle ORM:** Features 25+ tables, critical indexes, connection pooling, SSL/TLS, and automatic retry logic, ensuring data integrity and performance.

### System Design Choices
- **SEO-Optimized URL Structure:** Supports hierarchical URLs with unlimited category nesting and dynamic catch-all routes.
- **State Management:** React Query (TanStack Query v5) for efficient server state management and SSR support.
- **Authentication System:** Email/Password and Google OAuth with PostgreSQL session storage, email verification, welcome bonuses, referral tracking, and account linking.
- **Coin Economy ("Sweets"):** A virtual currency system with comprehensive transaction history, expiration management, fraud prevention, earning/spending mechanics, an XP/Rank system, and administrative controls.
- **Retention & Monitoring:** Includes a Retention Dashboard with loyalty tiers, badges, AI nudges, abandonment emails, and an Error Tracking & Monitoring System.
- **AI Integration:** Gemini AI for SEO content suggestions (admin-only, human approval, async processing) and bot engagement.
- **Messaging System:** Comprehensive private messaging (1-on-1 and group) with attachments, reactions, read receipts, typing indicators, full-text search, and moderation, with real-time updates via WebSocket.
- **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email), supporting various notification types (forum replies, mentions, follows, messages, purchases, etc.), email templates, and real-time updates.
- **Feature Flag System:** Enterprise-grade feature flags for controlled rollouts, including tri-state status, in-memory caching, "Coming Soon" pages, and admin dashboard controls.
- **Admin Dashboards:** Real-time analytics, user/marketplace/content management, security, communications, support, and audit logging.
- **Operational Automation:** Critical cron jobs for coin expiration, fraud detection, treasury snapshots, and balance reconciliation.
- **Rich Text Editor:** Enhanced TipTap editor with inline image insertion, drag & drop, and paste from clipboard.
- **EA Publishing System:** A complete Expert Advisor marketplace with a multi-step publishing form, secure file uploads, secure Object Storage, preview functionality, SEO optimization, and download management.
- **Marketplace UI:** Modern design featuring vibrant gradients, glassmorphism stats cards, bright product cards with hover effects, color-coded category badges, gradient pricing badges, shimmer loading skeletons, star ratings, and smooth micro-animations.
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