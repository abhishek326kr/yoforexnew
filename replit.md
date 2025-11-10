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

- **✅ COMPLETED: Object Storage Portability Refactoring**
  - **What Changed:** Refactored storage system to support deployment on any platform (Replit, AWS, VPS, Docker)
  - **Backend Changes (server/objectStorage.ts):**
    - Implemented dual-storage strategy with automatic environment detection
    - `ReplitSidecarSigner`: Uses Replit sidecar endpoint (`http://127.0.0.1:1106`)
    - `DirectGCSSigner`: Uses @google-cloud/storage SDK with service account credentials
    - `detectStorageMode()`: Auto-detects Replit vs non-Replit environments
    - Graceful fallback when GCS credentials missing (no crashes)
    - Descriptive error messages guide users to configure credentials
  - **Configuration (.env.example):**
    - Added complete object storage configuration section
    - Environment variables: `STORAGE_MODE`, `PRIVATE_OBJECT_DIR`, `GOOGLE_APPLICATION_CREDENTIALS`, `GCS_PROJECT_ID`
    - Auto-detection means no configuration needed on Replit
  - **Documentation (DEPLOYMENT.md):**
    - Added comprehensive "Object Storage Configuration" section
    - Step-by-step GCS bucket creation and service account setup
    - Troubleshooting guide for common errors
    - Cost optimization recommendations
  - **Status:** Architect-approved and production-ready for any deployment environment

- **✅ COMPLETED: Refactored File Upload System to Use Presigned URLs**
  - **What Changed:** Migrated from direct Google Cloud Storage uploads to Replit-compliant presigned URL flow
  - **Backend Changes (server/objectStorage.ts, server/routes.ts):**
    - Exposed `signObjectURL()` as public method for presigned URL generation via Replit sidecar endpoint
    - Updated `/api/marketplace/upload-ea` and `/api/marketplace/upload-screenshot` to return presigned URLs instead of handling uploads
    - API responses now include: `{ uploadURL, filePath, contentId }`
    - Fixed method signature in `getObjectEntityUploadURL()` to use instance method correctly
  - **Frontend Changes (app/marketplace/publish/PublishEAMultiStepClient.tsx):**
    - Implemented 3-step upload workflow: request presigned URL → direct upload to GCS → store normalized path
    - Updated TypeScript schema to include `contentId: z.string()` in eaFile object for proper screenshot grouping
    - Added null guard to prevent screenshot uploads before EA file upload completes
    - Captures and stores contentId from upload response for organizing files under `/yoforex-files/content/marketplace/ea/{uuid}/`
  - **Testing Status:** Code refactoring complete and architect-approved. Ready for end-to-end testing.
  - **⚠️ USER ACTION REQUIRED:** Must update `PRIVATE_OBJECT_DIR` environment variable in Replit Secrets from `/e119-91b8-4694-be75-9590cf2b82f8/content` to `/yoforex-files/content` before testing

- **Fixed Object Storage Configuration for File Uploads**
  - Created and connected `yoforex-files` bucket using Replit App Storage
  - Bucket ID: `e119-91b8-4694-be75-9590cf2b82f8`
  - Resolved "no allowed resources" 401 error by properly authorizing bucket for this Repl

- **Fixed "Publish EA" Page Authentication Issue**
  - Removed server-side authentication from `/marketplace/publish/page.tsx` that was causing unwanted redirects
  - Implemented client-side authentication guards in `PublishEAMultiStepClient.tsx` following DashboardClient pattern
  - Added three-state handling: loading skeleton → unauthenticated login prompt → authenticated form
  - Unauthenticated users now see a "Login Required" card instead of being redirected to home page
  - Server-side API protection remains in place at `/api/marketplace/publish-ea` endpoint

- **Fixed BadgeWall Component Data Structure Issue**
  - Updated `BadgeWall.tsx` to handle nested API response structure correctly
  - Added `BadgesResponse` interface to properly type API responses
  - Fixed `badges?.map is not a function` error by extracting data from `response.badges`

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