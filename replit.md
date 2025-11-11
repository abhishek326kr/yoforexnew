# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform designed for forex traders. It features forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to create a self-sustaining ecosystem by rewarding user contributions, providing valuable trading tools, and becoming a leading hub for forex traders. It empowers traders with community support and essential resources for market navigation.

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
- **Next.js:** Utilizes App Router, Server Components, and Incremental Static Regeneration (ISR).
- **Express API:** Provides RESTful endpoints, Replit OIDC authentication, rate limiting, and input validation. React Query manages client-side state and caching.
- **UI/UX:** Modern design with vibrant gradients, glassmorphism, bright product cards with hover effects, color-coded category badges, gradient pricing badges, shimmer loading skeletons, star ratings, and smooth micro-animations.
- **Authentication Pattern:** Client-side authentication checks preferred with `isLoading`, `isAuthenticated`, and `useAuthPrompt()` for three-state rendering (loading → unauthenticated prompt → authenticated content).

### Database Design
- **PostgreSQL with Drizzle ORM:** Features 25+ tables, critical indexes, connection pooling, SSL/TLS, and automatic retry logic.

### System Design Choices
- **SEO-Optimized URL Structure:** Supports hierarchical URLs with unlimited category nesting and dynamic catch-all routes, with JSON-LD structured data.
- **State Management:** React Query (TanStack Query v5) for efficient server state management and SSR support.
- **Authentication System:** Email/Password and Google OAuth with PostgreSQL session storage, email verification, welcome bonuses, referral tracking, and account linking.
- **Coin Economy ("Sweets"):** Virtual currency system with transaction history, expiration management, fraud prevention, earning/spending mechanics, and an XP/Rank system.
- **Retention & Monitoring:** Includes a Retention Dashboard with loyalty tiers, badges, AI nudges, abandonment emails, and an Error Tracking & Monitoring System.
- **AI Integration:** Gemini AI for SEO content suggestions and bot engagement.
- **Messaging System:** Comprehensive private messaging with attachments, reactions, read receipts, typing indicators, full-text search, and moderation, with real-time updates via WebSocket.
- **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email) and real-time updates.
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

### November 11, 2025 - User Registration 500 Error Fixed
**Issue:** User registration was failing with error: `500: {"error":"Column \"two_factor_enabled\" specified more than once"}`. The signup form would complete all validations but fail at the database insertion step.

**Root Cause:** The `users` table schema in `shared/schema.ts` had duplicate field definitions mapping to the same database columns:
- Lines 141-145: Snake_case naming (`two_factor_enabled`, `two_factor_secret`, `two_factor_backup_codes`, `two_factor_verified_at`, `two_factor_method`)
- Lines 224-228: CamelCase naming (`twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes`, `twoFactorVerifiedAt`, `twoFactorMethod`)

Both sets were mapping to the SAME PostgreSQL column names, causing Drizzle ORM to generate INSERT statements with duplicate column specifications.

**Solution:** Removed the duplicate snake_case field definitions (lines 141-145) and kept only the camelCase versions, since the codebase uses camelCase:
- `server/routes/adminOptimized.ts` references `users.twoFactorEnabled`
- `server/services/twoFactorService.ts` references `users.twoFactorEnabled`

**Files Modified:**
- `shared/schema.ts`: Removed duplicate 2FA field definitions

**Testing:**
- ✅ Application restarted successfully
- ✅ No schema errors in logs
- ✅ Database migrations working correctly
- ✅ Existing 2FA functionality preserved
- ✅ Architect reviewed and approved (PASS)

**Pattern for Future Use:**
When refactoring from snake_case to camelCase (or vice versa), ensure you:
1. Remove old field definitions completely
2. Update all references in the codebase
3. Never have two TypeScript properties mapping to the same database column name

### November 11, 2025 - Marketplace Screenshot Public Access & Security Hardening
**Issue:** Marketplace EA screenshots were not loading on EA detail pages (`/ea/[slug]`) because Next.js was handling `/objects/*` requests instead of proxying them to the Express API. Additionally, the initial implementation had a critical path traversal vulnerability.

**Root Cause:** 
1. Next.js App Router was handling `/objects/*` requests as Next.js routes instead of proxying them to Express
2. Initial security implementation used substring checking which could be bypassed with path traversal attacks like `/objects/marketplace/ea/../admin/...`

**Solution Implemented:**
1. **Added Next.js Rewrite Rule** (`next.config.js`):
   - Proxied all `/objects/*` requests to Express API (port 3001)
   - Added alongside existing `/api/*` rewrite rule
   - Uses `EXPRESS_URL` environment variable with fallback to `http://127.0.0.1:3001`

2. **Modified `/objects/*` Express Route** (`server/routes.ts`) with strict security:
   - **Path Normalization:** Uses `path.posix.normalize()` to prevent traversal attacks
   - **Prefix Validation:** Verifies normalized path still starts with `/objects/`
   - **Strict Regex Validation:** Only allows exact UUID-based paths matching canonical 8-4-4-4-12 format:
     ```regex
     /^\/objects\/marketplace\/ea\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/screenshots\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|jpeg|webp)$/i
     ```
   - **Public Access:** Marketplace screenshots matching the regex are publicly accessible
   - **Authentication Required:** All other object paths require authentication + ACL checks

**Security Features:**
- Path traversal attempts (e.g., `/../`, `/./`) are normalized and rejected
- Only exact UUID format with valid image extensions can access public screenshots
- Non-screenshot files maintain authentication + ACL protection
- Normalized paths are verified to prevent directory escaping

**Files Modified:**
- `next.config.js`: Added `/objects/:path*` rewrite rule
- `server/routes.ts`: Added secure public screenshot access route

**Testing:**
- ✅ Path normalization blocks traversal attempts
- ✅ Strict UUID regex prevents unauthorized access
- ✅ Marketplace screenshots are publicly accessible (when they exist)
- ✅ Other object files still require authentication
- ✅ Architect reviewed and approved (PASS with recommended improvements implemented)

**Security Review Recommendations:**
1. ✅ Upgraded path normalization from manual regex to `path.posix.normalize`
2. ✅ Tightened UUID regex to canonical 8-4-4-4-12 format
3. ✅ Added prefix verification after normalization
4. 📋 TODO: Add unit tests for path traversal attempts
5. 📋 TODO: Consider rate limiting on public screenshot endpoint

**Pattern for Future Use:**
When allowing public access to specific file patterns in Object Storage:
1. Always normalize paths using `path.posix.normalize()`
2. Verify the normalized path prefix to prevent escaping
3. Use strict regex patterns with exact UUID format validation
4. Never use substring checking for security decisions
5. Test with path traversal payloads: `/../`, `/./`, double-encoded sequences