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

### Cloudflare R2 Object Storage Integration (Nov 14, 2025)
**✅ COMPLETED** - Successfully migrated object storage from GCS/Replit to Cloudflare R2

**Overview:**
Implemented complete Cloudflare R2 support as a third storage mode alongside existing Replit and GCS options. The system now automatically detects R2 credentials and uses AWS S3-compatible API for all object storage operations.

**Implementation Details:**

**1. R2Signer Class (server/objectStorage.ts):**
- Created R2Signer implementing StorageSigner interface
- Initialized S3Client with:
  - region: 'auto'
  - endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
  - credentials: R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
- Implements signURL() for presigned URL generation
- Maps HTTP methods (GET/HEAD/PUT/DELETE) to S3 commands

**2. Storage Mode Detection:**
- Updated detectStorageMode() to support 'r2' | 'replit' | 'gcs'
- Auto-detects R2 when CLOUDFLARE_ACCOUNT_ID + R2_ACCESS_KEY_ID present
- Checks STORAGE_MODE env var for explicit mode selection
- Falls back to Replit/GCS detection

**3. Complete R2 Operations Support:**
- **uploadFromBuffer()**: Uses S3 PutObjectCommand for uploads
- **downloadObject()**: Uses S3 GetObjectCommand for streaming downloads
- **getObjectEntityFile()**: Uses S3 HeadObjectCommand to verify object exists
- **searchPublicObject()**: Uses S3 HeadObjectCommand to check public objects
- **ACL Methods**: Skipped for R2 (R2 uses bucket-level permissions + presigned URLs)
- **Path Normalization**: Converts R2 paths to /objects/... format for database

**4. R2 Helper Methods:**
- `getR2Client()`: Initializes and caches S3Client for R2 operations
- `checkR2ObjectExists(key)`: Verifies object existence using HeadObjectCommand
- `getR2Object(key)`: Retrieves object metadata and stream
- `deleteR2Object(key)`: Deletes R2 objects

**Environment Variables Required:**
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name
- `STORAGE_MODE` - Optional explicit mode ('r2', 'replit', 'gcs')
- `PRIVATE_OBJECT_DIR` - Object storage directory (e.g., `/bucket-name/content`)

**Files Modified:**
- `server/objectStorage.ts` - Complete R2 integration with all operations
- `package.json` - Added @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner

**Verification:**
- ✅ Server auto-detects R2 mode: "[ObjectStorage] Auto-detected R2 credentials, using r2 mode"
- ✅ No TypeScript/LSP errors
- ✅ Backward compatible with existing Replit and GCS modes
- ✅ All CRUD operations (Create, Read, Update, Delete) work with R2
- ✅ Presigned URLs work for secure access
- ✅ Path normalization correct (/objects/... format)

**Benefits:**
- Zero egress fees with Cloudflare R2 (vs GCS)
- S3-compatible API for easy integration
- Automatic mode detection based on credentials
- Seamless migration path from GCS/Replit

### File Upload Error Handling Fix (Nov 14, 2025)
**✅ COMPLETED** - Fixed critical upload errors: "Unexpected field" and "uploadObject is not a function"

**Problems Identified:**
1. **"Unexpected field" Error:**
   - Users encountered 500 error when uploading images in discussions
   - Multer errors weren't being caught before throwing to Express
   - Frontend using wrong field name ('file' instead of 'files')

2. **"uploadObject is not a function" Error:**
   - Backend calling non-existent method `uploadObject()`
   - Should use `uploadFromBuffer()` instead

**Root Causes:**
1. **Backend - Missing Error Handling:**
   - Multer errors (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, LIMIT_UNEXPECTED_FILE) not properly caught
   - Errors threw before route handler execution → generic 500 responses

2. **Frontend - Field Name Mismatch:**
   - RichTextEditorClient using `formData.append('file', ...)` (singular)
   - Backend expecting `'files'` (plural)

3. **Backend - Wrong Method Name:**
   - Code calling `objectStorageService.uploadObject()` which doesn't exist
   - Correct method is `uploadFromBuffer(objectPath, buffer, contentType)`

**Solutions Implemented:**

**Backend (server/routes.ts):**
1. Wrapped multer middleware in custom error handler catching all errors before route handler
2. Specific error messages for each error type:
   - LIMIT_FILE_SIZE: "File too large. Maximum size is 10MB per file."
   - LIMIT_FILE_COUNT: "Too many files. Maximum 10 files allowed."
   - LIMIT_UNEXPECTED_FILE: "Unexpected file field. Please use 'files' as the field name."
3. Fixed ObjectStorageService method call: `uploadObject()` → `uploadFromBuffer()`
4. Added detailed logging with `[Upload] Multer error:` prefix

**Frontend:**
- RichTextEditorClient.tsx: Changed field name from 'file' to 'files'
- Updated response parsing to handle array response
- test-errors/page.tsx: Fixed field name for testing

**Files Modified:**
- `server/routes.ts` - Error handling + ObjectStorageService fix
- `app/discussions/new/RichTextEditorClient.tsx` - Field name + response parsing
- `app/test-errors/page.tsx` - Field name fix

**Verification:**
- ✅ Server running successfully
- ✅ No "uploadObject is not a function" errors
- ✅ No "Unexpected field" errors
- ✅ Image uploads in rich text editor work correctly
- ✅ Helpful error messages for upload failures
- ✅ Production-ready with detailed logging

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
    -   **Notification System:** Comprehensive infrastructure with dual delivery (WebSocket + Email) and real-time updates.
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