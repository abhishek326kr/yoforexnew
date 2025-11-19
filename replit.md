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

## Recent Changes

### Object Storage Simplification & File Upload Persistence Fix (November 19, 2025)

**Object Storage Simplification:**
-   **Simplified to R2-only storage:** Removed Replit Object Storage and GCS implementations, reducing `server/objectStorage.ts` from ~1130 lines to ~570 lines (~50% reduction)
-   **Removed dependencies:** Uninstalled `@replit/object-storage` and `@google-cloud/storage` packages
-   **Fixed HEAD request signing:** Corrected signR2URL to use HeadObjectCommand for HEAD requests instead of GetObjectCommand
-   **Maintained backward compatibility:** All existing file paths in database continue to work with path normalization
-   **Required environment variables:** CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, PRIVATE_OBJECT_DIR
-   **Metadata storage:** All file metadata (filePath, fileUrl, imageUrls) continues to be stored in Postgres as before

**File Upload Persistence Fix:**
-   **Fixed /api/upload/simple:** Now persists images to R2 storage instead of volatile memory
-   **Fixed /api/upload/ea:** Now persists EA files (.ex4, .ex5, .mq4, .mq5, .zip) to R2 storage
-   **Fixed /api/images/:filename:** Downloads from R2 with backward compatibility for legacy in-memory files
-   **Graceful fallback:** When R2 credentials are missing (local dev), falls back to in-memory storage with console warnings
-   **Production requirement:** R2 credentials MUST be configured in production for file persistence
-   **Path consistency:** Upload returns `/api/images/${filename}`, download accepts same format
-   **Storage indicator:** Upload response includes `storage: 'r2' | 'memory'` field to indicate storage location

### "Post Thread" Functionality Fix (November 19, 2025)

**Problem:** Thread creation was failing silently due to data format mismatch between frontend and backend.

**Root Causes Identified:**
1. RichTextEditor was sending HTML in `body` field instead of plain text
2. Frontend wasn't sending `contentHtml` field at all
3. Attachments were sent as URL strings instead of proper objects
4. Attachment objects were fabricated with random UUIDs instead of using upload API response
5. Draft system wasn't saving/loading `contentHtml` field
6. Validation errors weren't displaying to users

**Fixes Implemented in EnhancedThreadComposeClient.tsx:**
1. **Form Schema:** Added `contentHtml` and `attachments` fields, removed `attachmentUrls`
2. **Rich Text Editor Binding:** FormField bound to `body` for validation, reads from `contentHtml` for display, onChange sets BOTH fields
3. **Plain Text Extraction:** Automatically extracts plain text from HTML using `stripHtmlTags()` and sets to `body` field
4. **Attachment Handling:** Uses actual file metadata from upload API response (`response.files`) instead of fabricating data
5. **onSubmit Function:** Maps uploaded files to attachments by adding only `price: 0` and `downloads: 0` fields
6. **Draft System:** Updated auto-save to include `contentHtml` in save trigger, both `body` and `contentHtml` now saved/restored
7. **Validation Feedback:** Users now see clear error messages when content is too short (<150 chars)

**Backend Compatibility:**
- Backend schema (`shared/schema.ts`) already supports `contentHtml` (line 2794) and structured `attachments` (lines 2797-2805)
- API endpoint (`server/routes.ts` line 6011) already handles both fields correctly
- No backend changes required - only frontend needed fixing

**Results:**
✅ Thread creation now works end-to-end
✅ Both plain text (`body`) and rich HTML (`contentHtml`) sent to API
✅ Attachments include all required metadata
✅ Validation errors display correctly to users
✅ Draft system preserves rich content
✅ Ready for production deployment

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
    -   **Object Storage Architecture:** R2-only implementation with all file metadata stored in Postgres (filePath, fileUrl, imageUrls columns). Supports HEAD requests for metadata validation, backward compatible with legacy paths.
    -   **Autoscale Deployment Architecture:** Lightweight Express app for immediate health checks and asynchronous loading of the full application for rapid port binding and health check compliance in production.
    -   **Build & Deployment Architecture:** Route group structure (`(public)`, `(app-shell)`), build-safe auth fetching, SSR-safe fetch layer for data fetching during builds, and consistent `@` aliases for import paths.
    -   **Error Handling Infrastructure:** Comprehensive error handling with structured logging, error categorization (6 types), severity levels (4 levels), context-aware logging with sensitive data sanitization, user-friendly messages, and transaction safety for critical operations.

## External Dependencies

-   **Core Infrastructure:** Neon PostgreSQL (serverless database), Cloudflare R2 (object storage), Replit OIDC (OAuth authentication provider).
-   **Email Services:** Hostinger SMTP (transactional email delivery).
-   **Analytics & SEO:** Google Tag Manager, Google Analytics 4, Google Search Console, Bing Webmaster Tools, Yandex Webmaster, Google PageSpeed Insights API, Gemini AI.
-   **Development Tools:** Drizzle Kit, TypeScript, shadcn/ui, TailwindCSS, Recharts, Zod, Vitest, Supertest, socket.io & socket.io-client.
-   **Build & Deployment:** Next.js 16, esbuild, Docker.