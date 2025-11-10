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

### Welcome & Email Verification System (November 10, 2025)
Implemented complete email verification flow for new user signups:

1. **Registration Flow Integration:**
   - Generates secure 32-byte verification token on signup
   - Stores token in `emailVerificationTokens` table with 24-hour expiration
   - Sends professional welcome email with verification link
   - Email includes platform overview and feature highlights
   - Continues to work even if email sending fails (graceful degradation)

2. **Email Verification Endpoint:**
   - POST `/api/auth/verify-email` validates tokens
   - Checks token expiration (24-hour window)
   - Updates `users.is_email_verified` to true
   - Deletes token after use (single-use security)
   - Clear error messages for expired/invalid tokens

3. **Frontend Verification Page:**
   - New page at `/verify-email` handles verification links
   - Extracts token from URL query parameters
   - Shows real-time verification status (verifying/success/error)
   - Professional UI with loading states and error handling
   - Navigation options to dashboard, home, or earnings

4. **Security Features:**
   - Cryptographically secure random tokens (32 bytes)
   - 24-hour expiration window
   - Single-use tokens (deleted after verification)
   - Non-blocking registration (email failures don't prevent signup)
   - Email field requirement for verification

**Files Modified:**
- `server/localAuth.ts` - Added verification token generation and email sending to registration
- `server/localAuth.ts` - Added POST /api/auth/verify-email endpoint
- `app/verify-email/page.tsx` - New frontend verification page
- `shared/schema.ts` - Leveraged existing emailVerificationTokens table

**User Experience:**
1. User registers with email → receives welcome email
2. User clicks verification link → redirected to /verify-email
3. Email verified automatically → success message shown
4. User can navigate to dashboard or start earning coins

**Status:**
- ✅ Complete signup-to-verification flow working
- ✅ 25+ email templates ready (purchases, notifications, etc.)
- ✅ Architect approved as production-ready
- ✅ Graceful error handling throughout

**Future Enhancements (Optional):**
- Resend verification email endpoint
- Token hashing in database
- Enhanced UI copy for expired links

### SMTP Email System & Database Fixes (November 10, 2025)
Completed SMTP testing system and critical database error fixes:

1. **Database Error Resolution:**
   - Fixed foreign key constraint violations in error tracking system
   - Created system automation user (UUID: 00000000-0000-0000-0000-000000000001)
   - Created `server/constants.ts` with SYSTEM_AUTOMATION_USER_ID constant
   - Updated all auto-resolve functions to use proper user references
   - Eliminated recurring "auto-system" foreign key errors

2. **SMTP Configuration & Testing:**
   - Configured Hostinger SMTP credentials (smtp.hostinger.com:465)
   - Successfully sent test email to ranjan.nayak1968@gmail.com
   - Message ID: <a01a82a1-9390-4d88-d45a-3ea8c021db99@yoforex.net>
   - Verified email delivery with YoForex branding

3. **SMTP Admin Panel:**
   - Added SMTP Settings tab to `/admin/communications`
   - Real-time SMTP connection status monitoring
   - Test connection functionality
   - Secure test email sending with recipient restrictions
   - Visual status indicators (connected/failed/not tested)

4. **Security Hardening:**
   - Restricted test email recipients to admin's own email + whitelist
   - Added rate limiting (5 requests per 15 minutes)
   - Implemented audit logging for all SMTP test sends
   - Fixed BASE_URL fallback in email templates (prevents broken links)
   - Removed server/send-smtp-test.ts standalone script

**Files Modified:**
- `server/constants.ts` - New file with SYSTEM_AUTOMATION_USER_ID
- `server/storage.ts` - Updated auto-resolve functions to use constant
- `server/seed.ts` - Added system automation user creation
- `server/routes.ts` - Added 3 SMTP admin endpoints with security controls
- `server/services/emailService.ts` - Added sendTestEmail method, BASE_URL fallback
- `server/rateLimiting.ts` - Created smtpTestLimiter
- `app/admin/communications/page.tsx` - Added SMTP Settings tab

**Security Features:**
- Recipient whitelist: admin's email + ['ranjan.nayak1968@gmail.com', 'test@yoforex.net']
- Rate limiting: 5 SMTP tests per 15 minutes per admin
- Audit trail: All test sends logged to adminActions table
- Fallback URLs: Email links work even without BASE_URL env var

**Status:**
- ✅ SMTP verified working with Hostinger
- ✅ Database errors eliminated
- ✅ Admin panel fully functional
- ✅ All security controls active
- ✅ Production-ready (architect approved)

### SEO & Performance Optimizations (November 10, 2025)
Completed comprehensive SEO improvements for 2025 production deployment:

1. **Data Cleanup & Integrity:**
   - Fixed 53 orphaned category references (25 threads, 28 content items)
   - Backfilled missing category data via SQL script at `/tmp/backfill-categories.sql`
   - Sitemap increased from 584 to 637 valid URLs
   - Achieved 100% referential integrity for category relationships

2. **Performance Optimization:**
   - Implemented categoryPath caching in both sitemap generators
   - Added sequential cache warm-up before URL generation
   - Reduced database queries by ~67% (from ~200 to ~67 per sitemap generation)
   - 5-minute TTL in-memory cache in `lib/category-path.ts`

3. **Social Sharing Metadata:**
   - Added og:image and Twitter Card tags to all major pages
   - Marketplace, forum threads, content pages, and categories now have complete social metadata
   - Dynamic images with intelligent fallbacks (thread.thumbnailUrl, content.thumbnailUrl, etc.)
   - All images use 1200x630 optimal dimensions for social previews

4. **Production Cache Headers:**
   - Confirmed 18/20 routes use production-ready tiered caching
   - CDN-friendly headers with `public, max-age, stale-while-revalidate`
   - Email tracking pixels correctly use no-store (analytics integrity)
   - Cache TTLs tuned by content volatility (30s to 1 year)

**Files Modified:**
- `app/marketplace/page.tsx` - Added og:image + Twitter Cards
- `app/category/[...path]/page.tsx` - Added metadata for threads, content, categories
- `server/services/sitemap-generator.ts` - Implemented cache warm-up
- `app/sitemap.ts` - Implemented cache warm-up
- `lib/category-path.ts` - Shared caching utility (existing)

**SEO Impact:**
- All 637 sitemap URLs now have valid category references ✅
- Sitemap generation 67% faster with reduced DB load ✅
- Social sharing previews on Facebook, Twitter, LinkedIn ✅
- Production-ready caching for optimal performance ✅

## System Architecture

YoForex employs a hybrid frontend built with Next.js and a robust Express.js backend, leveraging PostgreSQL for data persistence.

### Hybrid Frontend Architecture
- **Next.js:** Utilizes App Router, Server Components, and Incremental Static Regeneration (ISR) for the primary user-facing application.
- **Express API:** Provides RESTful endpoints, Replit OIDC authentication, rate limiting, and input validation. React Query manages client-side state and caching.
- **UI/UX:** Modern design with vibrant gradients, glassmorphism, bright product cards with hover effects, color-coded category badges, gradient pricing badges, shimmer loading skeletons, star ratings, and smooth micro-animations.

### Database Design
- **PostgreSQL with Drizzle ORM:** Features 25+ tables, critical indexes, connection pooling, SSL/TLS, and automatic retry logic, ensuring data integrity and performance.

### System Design Choices
- **SEO-Optimized URL Structure:** Supports hierarchical URLs with unlimited category nesting and dynamic catch-all routes, with implemented JSON-LD structured data for enhanced search engine understanding.
- **State Management:** React Query (TanStack Query v5) for efficient server state management and SSR support.
- **Authentication System:** Email/Password and Google OAuth with PostgreSQL session storage, email verification, welcome bonuses, referral tracking, and account linking.
- **Coin Economy ("Sweets"):** A virtual currency system with comprehensive transaction history, expiration management, fraud prevention, earning/spending mechanics, an XP/Rank system, and administrative controls.
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