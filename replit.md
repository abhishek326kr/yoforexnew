# YoForex - Expert Advisor Forum & Marketplace

## Overview
YoForex is a comprehensive trading community platform for forex traders, offering forums, an Expert Advisor (EA) marketplace, broker reviews, and a virtual coin economy ("Sweets"). The platform aims to create a self-sustaining ecosystem by rewarding user contributions, providing valuable trading tools, and becoming a leading hub for forex traders, empowering them with community support and essential market navigation resources.

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

### Registration Duplicate Column Fix (November 11, 2025)

**CRITICAL FIX:** Resolved SQL error "column 'two_factor_enabled' specified more than once" that prevented user registration.

**Problem Identified:**
- Users could not register when req.body contained both camelCase (`twoFactorEnabled`) and snake_case (`two_factor_enabled`) versions of the same field
- Drizzle ORM generated SQL with duplicate columns, causing PostgreSQL error 42701
- Root cause: Frontend or clients sending mixed field naming conventions

**Solution Implemented:**

1. **Dynamic Filter Function** (`server/validation.ts`):
   - Created `filterUserRegistrationDuplicates()` to intelligently remove snake_case duplicates
   - Uses `snakeToCamel()` helper to convert snake_case → camelCase dynamically
   - Two-pass algorithm: identifies snake_case keys with camelCase equivalents, filters them out
   - Works for ANY future field names (e.g., `user_name`/`userName`, `is_active`/`isActive`)
   - Comprehensive documentation included

2. **Applied to All Registration Endpoints**:
   - `server/localAuth.ts` - `/api/register` endpoint (line 248)
   - `server/routes.ts` - `/api/auth/register` endpoint (line 603)
   - Both use explicit `filteredBody` variable with critical warning comments
   - Prevents future mistakes with clear intent: "DO NOT use req.body after this point"

3. **Automated Regression Tests**:
   - **Unit Tests** (`tests/logic/registration-duplicates.test.ts`): 13 tests for filter function logic
   - **Integration Tests** (`tests/integration/registration-endpoints.test.ts`): 2 tests for actual endpoints
   - **Total: 15 tests** (100% passing)
   - Comprehensive coverage of filter logic and endpoint behavior
   - All tests documented with inline comments

**Files Modified:**
- `server/validation.ts` - Dynamic filter implementation
- `server/routes.ts` - Applied filter to `/api/auth/register`
- `server/localAuth.ts` - Applied filter to `/api/register`
- `tests/logic/registration-duplicates.test.ts` (new) - Unit tests for filter function
- `tests/integration/registration-endpoints.test.ts` (new) - Integration tests for endpoints

**Critical Rules Going Forward:**
- ✅ ALL registration endpoints MUST use `filterUserRegistrationDuplicates()` before validation
- ✅ Store filtered data in explicit `filteredBody` variable
- ✅ Add warning comments: "DO NOT use req.body after this point"
- ✅ Filter is robust for future schema changes (no hard-coded field names)

**Testing:**
- Run unit tests: `npx vitest run tests/logic/registration-duplicates.test.ts`
- Run integration tests: `npx vitest run tests/integration/registration-endpoints.test.ts`
- All 15 tests passing (13 unit + 2 integration)
- Verified with manual testing: Status 200, user created successfully

### Coin Economy Reconciliation & Prevention System (November 11, 2025)

**CRITICAL FIX:** Resolved major coin economy integrity issue affecting 9,684 coins and 701 users.

**Problem Identified:**
- 9,684 coin discrepancy between user wallets (18,710) and transaction ledger (28,394)
- 29 users had transactions but no wallet records (7,451 coins)
- 8 users had wallet-transaction mismatches (2,233 coins)
- 676 users had no wallet records at all
- Root cause: Legacy code bypassed CoinTransactionService, creating transactions without updating/creating wallets

**Solution Implemented:**

1. **Reconciliation Script** (`scripts/reconcile-coin-economy.ts`):
   - Created 676 missing wallets
   - Updated 25 wallet balances to match transaction history
   - Reconciled all 9,684 missing coins
   - Final state: 896 users, all balanced at 28,394 total coins
   - Can be run with `npx tsx scripts/reconcile-coin-economy.ts --force`
   - Includes dry-run mode for safety verification

2. **Service Enforcement** (10 locations refactored):
   - `server/storage/domains/users.ts`: Active engagement rewards
   - `server/storage/domains/content.ts`: Free downloads, purchases, content likes
   - `server/localAuth.ts`: Welcome bonus with idempotency key
   - `server/services/botBehaviorEngine.ts`: Bot marketplace transactions + engagement rewards
   - All now use CoinTransactionService.executeTransaction() with proper triggers/channels

3. **Transaction Context Support**:
   - Added optional `providedTx` parameter to CoinTransactionService
   - Prevents nested transaction issues (atomicity preservation)
   - Callers with existing db.transaction() pass their context
   - Standalone calls create their own transaction

4. **Side-Effect Safety**:
   - WebSocket events (balance updates) deferred until after transaction commits
   - Success guard ensures events only emit on successful transactions
   - Prevents phantom balance notifications on rollbacks

5. **Performance Optimization**:
   - BotBehaviorEngine uses singleton CoinTransactionService instance
   - Enhanced error logging for failed coin transactions
   - Reduced database connection overhead

6. **Database Safeguard** (`server/migrations/add-wallet-existence-trigger.sql`):
   - PostgreSQL trigger ensures wallet exists before coin_transactions insert
   - Auto-creates wallets with zero balance if missing
   - Defense-in-depth against future wallet-transaction mismatches

**Files Modified:**
- `scripts/reconcile-coin-economy.ts` (new)
- `server/services/coinTransactionService.ts`
- `server/storage/domains/content.ts`
- `server/storage/domains/users.ts`
- `server/localAuth.ts`
- `server/services/botBehaviorEngine.ts`
- `server/migrations/add-wallet-existence-trigger.sql` (new)

**Critical Rules Going Forward:**
- ✅ ALL coin transactions MUST use CoinTransactionService.executeTransaction()
- ✅ NEVER directly insert into coin_transactions table
- ✅ Pass transaction context (providedTx) when within existing db.transaction()
- ✅ Only emit side-effects after transaction commits successfully
- ✅ Use proper SWEETS_TRIGGERS and SWEETS_CHANNELS taxonomy
- ✅ Add idempotency keys for critical transactions (welcome bonus, purchases)

**Monitoring:**
- Database trigger provides automatic wallet creation safety net
- Enhanced logging tracks all failed coin transactions
- Service validates all triggers/channels against taxonomy
- Fraud detection and rate limiting remain active

## System Architecture

YoForex utilizes a hybrid frontend built with Next.js and a robust Express.js backend, with PostgreSQL for data persistence.

### Hybrid Frontend Architecture
- **Next.js:** Employs App Router, Server Components, and Incremental Static Regeneration (ISR).
- **Express API:** Provides RESTful endpoints, Replit OIDC authentication, rate limiting, and input validation.
- **UI/UX:** Modern design featuring vibrant gradients, glassmorphism, bright product cards with hover effects, color-coded category badges, gradient pricing badges, shimmer loading skeletons, star ratings, and smooth micro-animations.
- **Authentication Pattern:** Client-side authentication checks with `isLoading`, `isAuthenticated`, and `useAuthPrompt()` for three-state rendering.

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