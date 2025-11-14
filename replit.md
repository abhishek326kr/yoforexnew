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

### Thread Creation Infinite Loop Fix (Nov 14, 2025)
**✅ COMPLETED** - Fixed "Maximum update depth exceeded" error when creating forum threads

**Problem:** Users experienced infinite loop error when creating threads. The page would crash with "Maximum update depth exceeded" React error, making it impossible to post threads.

**Root Causes Identified:**

1. **useEditor Hook Recreating on Every Render** (Primary Issue):
   - The TipTap useEditor hook was called without a dependency array
   - Created fresh configuration object on every render
   - Editor instance torn down and recreated repeatedly
   - Caused component mount/unmount infinite loop

2. **setValue Called on Every Keystroke** (Secondary Issue):
   - `handleEditorUpdate` called `setValue` on every TipTap keystroke
   - React Hook Form re-rendered parent component
   - HTML sanitization potentially triggered editor updates
   - No value comparison meant identical content still triggered setValue

**Solutions Implemented:**

1. **Fixed useEditor Hook** in `RichTextEditorClient.tsx`:
   ```typescript
   const editor = useEditor({
     // ... configuration ...
   }, []); // Empty dependency array prevents recreation
   ```
   This ensures the editor is created ONCE and persists across renders.

2. **Added Value Comparison Guard** in `EnhancedThreadComposeClient.tsx`:
   ```typescript
   const handleEditorUpdate = useCallback((html: string, text: string) => {
     const currentValues = getValues();
     
     // Only update if values have actually changed
     if (currentValues.contentHtml !== html) {
       setValue("contentHtml", html);
     }
     if (currentValues.body !== text) {
       setValue("body", text);
     }
   }, [setValue, getValues]);
   ```

3. **Added Optional Chaining** for safety:
   - Used `onUpdateRef.current?.()` to safely call callback

**Pattern for TipTap + React Hook Form:**
```typescript
// ❌ BAD: Editor recreates on every render
const editor = useEditor({ config });

// ✅ GOOD: Editor created once
const editor = useEditor({ config }, []);

// ❌ BAD: Calls setValue unconditionally
const handleUpdate = (html, text) => {
  setValue("html", html);
  setValue("text", text);
};

// ✅ GOOD: Compare before updating
const handleUpdate = (html, text) => {
  const current = getValues();
  if (current.html !== html) setValue("html", html);
  if (current.text !== text) setValue("text", text);
};
```

**Files Modified:**
- `app/discussions/new/RichTextEditorClient.tsx` - Added dependency array to useEditor + optional chaining
- `app/discussions/new/EnhancedThreadComposeClient.tsx` - Added comparison guard

**Status:** ✅ Complete - Users can now create threads without infinite loops

### Website-Wide Infinite Loop Prevention System (Nov 14, 2025)
**✅ COMPLETED** - Created reusable solution to prevent infinite loops across the entire platform

**Problem:** React useEffect hooks with callback dependencies can cause infinite loops when callbacks trigger re-renders, which recreate callbacks, which trigger useEffect again.

**Solution Implemented:**

1. **Created useLatestRef Utility Hook** (`app/hooks/useLatestRef.ts`):
   - Reusable pattern for storing callbacks in refs
   - Prevents useEffect from re-running when callbacks change
   - Ensures latest callback version is always used

2. **Fixed useMessagingSocket.ts**:
   - Had 10 callback props in dependency array causing socket reconnections on every parent re-render
   - Applied ref pattern to all callbacks
   - Changed deps from `[userId, queryClient, ...10 callbacks]` to `[userId, queryClient]`
   - Result: Socket connects once per user session, no reconnection storms

3. **Fixed RichTextEditorClient.tsx**:
   - `onUpdate` callback in deps caused infinite loops when submitting threads
   - Applied ref pattern to store callback
   - Result: Editor listeners register once, use latest callback

**Pattern:**
```typescript
// Before (causes infinite loops)
useEffect(() => {
  resource.on('event', () => callback());
}, [resource, callback]); // ❌

// After (stable)
const callbackRef = useLatestRef(callback);
useEffect(() => {
  resource.on('event', () => callbackRef.current());
}, [resource]); // ✅
```

**Files Modified:**
- `app/hooks/useLatestRef.ts` (NEW) - Reusable utility
- `app/hooks/useMessagingSocket.ts` - Fixed WebSocket loops
- `app/discussions/new/RichTextEditorClient.tsx` - Fixed editor loops

**Status:** ✅ Architect approved - production ready with "Pass" rating

### Rich Text Editor Image Upload Fix (Nov 14, 2025)
**✅ COMPLETED** - Fixed image upload system for TipTap rich text editor

**Problem:** Images uploaded through TipTap rich text editor weren't displaying after upload due to incorrect path handling.

**Root Cause:** Upload endpoints were passing RELATIVE paths instead of FULL paths with private directory prefix, causing path duplication issues in getObjectEntityFile.

**Fixes Implemented:**

1. **Upload Endpoints** - All three upload endpoints now use full paths with private directory:
   - TipTap: `${privateDir}/uploads/${filename}`
   - Thread images: `${privateDir}/thread-images/${userId}/${filename}`
   - Message attachments: `${privateDir}/message-attachments/${filename}`

2. **Image Serving Endpoint** - Created `/api/images/*` endpoint for secure image delivery with ACL-based authorization

3. **getObjectEntityFile Fix** - Updated to handle both normalized (`/objects/...`) and legacy (privateDir-prefixed) paths without duplication

**Complete Upload→Download Flow:**
1. Upload → R2 stores at `e119.../content/uploads/filename.jpg`
2. Normalize → Returns `/objects/uploads/filename.jpg`
3. Response → `/api/images/uploads/filename.jpg`
4. GET → Reconstructs `/objects/uploads/filename.jpg`
5. getObjectEntityFile → Extracts entityId correctly (no duplication)
6. Download → Fetches from R2 using correct key

**Files Modified:**
- `server/routes.ts` - Fixed upload endpoints + created /api/images/* serving endpoint
- `server/objectStorage.ts` - Fixed getObjectEntityFile + added comprehensive logging

**Status:** ✅ Completed

### Cloudflare R2 Object Storage Migration (Nov 14, 2025)
**✅ COMPLETED** - Successfully migrated object storage from GCS/Replit to Cloudflare R2 with full S3-compatible API integration

**Status:** Fully functional with auto-detection, comprehensive logging, and backward compatibility

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

-   **Core Infrastructure:** Neon PostgreSQL (serverless database), Cloudflare R2 (object storage), Replit OIDC (OAuth authentication provider).
-   **Email Services:** Hostinger SMTP (transactional email delivery).
-   **Analytics & SEO:** Google Tag Manager, Google Analytics 4, Google Search Console, Bing Webmaster Tools, Yandex Webmaster, Google PageSpeed Insights API, Gemini AI.
-   **Development Tools:** Drizzle Kit, TypeScript, shadcn/ui, TailwindCSS, Recharts, Zod, Vitest, Supertest, socket.io & socket.io-client.
-   **Build & Deployment:** Next.js 16, esbuild, Docker.