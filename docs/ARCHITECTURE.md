# System Architecture

## Table of Contents
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [System Components](#system-components)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Architecture](#database-architecture)
- [Authentication Architecture](#authentication-architecture)
- [WebSocket Architecture](#websocket-architecture)
- [Caching Strategy](#caching-strategy)
- [Performance Optimizations](#performance-optimizations)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Monitoring & Observability](#monitoring--observability)

## Overview

YoForex employs a modern, scalable architecture built on the JAMstack principles with a hybrid approach combining server-side rendering (SSR) and client-side interactions. The system is designed for high performance, security, and maintainability.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Next.js    │  │    React     │  │   TanStack   │     │
│  │  App Router  │  │  Components  │  │    Query     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  TailwindCSS │  │  shadcn/ui   │  │  Socket.IO   │     │
│  │              │  │              │  │    Client    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │                 Express.js Server                  │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │      │
│  │  │   Auth    │  │   REST    │  │WebSocket │       │      │
│  │  │Middleware │  │    API    │  │  Server  │       │      │
│  │  └──────────┘  └──────────┘  └──────────┘       │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Email   │  │  Sweets   │  │   Bot     │  │  Search  │  │
│  │ Service  │  │  Service  │  │  Service  │  │  Service │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Notification│ │  Forum   │  │Marketplace│  │  Admin   │  │
│  │  Service  │  │ Service  │  │  Service  │  │ Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              PostgreSQL (Neon)                     │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │      │
│  │  │  Users   │  │  Forum   │  │ Marketplace│      │      │
│  │  └──────────┘  └──────────┘  └──────────┘       │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │      │
│  │  │  Coins   │  │ Messages │  │   Admin   │       │      │
│  │  └──────────┘  └──────────┘  └──────────┘       │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Object Storage (S3-compatible)           │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Firebase │  │   SMTP    │  │  Google   │  │   CDN    │  │
│  │   Auth   │  │  Server   │  │Analytics  │  │(Cloudflare)│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. Separation of Concerns
- **Frontend**: Presentation and user interaction
- **API Gateway**: Request routing and authentication
- **Service Layer**: Business logic and domain services
- **Data Layer**: Data persistence and retrieval
- **External Services**: Third-party integrations

### 2. Scalability
- Horizontal scaling through stateless services
- Database connection pooling
- CDN for static assets
- Async job processing

### 3. Security
- Defense in depth approach
- Input validation at every layer
- Encrypted data transmission
- Secure session management

### 4. Performance
- Server-side rendering for initial load
- Client-side caching with React Query
- Database query optimization
- Image optimization

### 5. Maintainability
- TypeScript for type safety
- Modular service architecture
- Comprehensive testing
- Clear documentation

## System Components

### Core Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js 16 | User interface, SSR/SSG |
| API Gateway | Express.js | REST API, middleware |
| Database | PostgreSQL | Primary data storage |
| ORM | Drizzle | Database abstraction |
| WebSocket | Socket.IO | Real-time communication |
| Auth | Firebase | Authentication provider |
| Email | Nodemailer | Email delivery |
| Storage | Object Storage | File storage |
| CDN | Cloudflare | Static asset delivery |

## Frontend Architecture

### Next.js App Router

```
app/
├── (public)/              # Public routes
│   ├── page.tsx          # Homepage
│   ├── forum/            # Forum pages
│   ├── marketplace/      # Marketplace
│   └── layout.tsx        # Shared layout
├── (authenticated)/       # Protected routes
│   ├── dashboard/        # User dashboard
│   ├── messages/         # Messaging
│   └── settings/         # User settings
├── admin/                # Admin routes
│   ├── layout.tsx        # Admin layout
│   └── [...sections]/    # Dynamic admin pages
└── api/                  # API routes (proxy to Express)
```

### Component Architecture

```typescript
// Component hierarchy
<AppProviders>
  <AuthContext>
    <ThemeProvider>
      <QueryProvider>
        <Header />
        <main>{children}</main>
        <Footer />
      </QueryProvider>
    </ThemeProvider>
  </AuthContext>
</AppProviders>
```

### State Management

- **Server State**: TanStack Query (React Query v5)
- **Client State**: React Context + useState
- **Form State**: React Hook Form
- **URL State**: Next.js router

### Rendering Strategies

| Strategy | Use Case |
|----------|----------|
| SSR | Dynamic content, SEO-critical pages |
| SSG | Static content, marketing pages |
| ISR | Semi-dynamic content, blog posts |
| CSR | Interactive features, dashboards |

## Backend Architecture

### Express.js Server

```typescript
// Server structure
server/
├── index.ts              // Entry point
├── routes.ts             // Route definitions
├── middleware/           // Express middleware
│   ├── auth.ts          // Authentication
│   ├── rateLimiter.ts   // Rate limiting
│   ├── security.ts      // Security headers
│   └── errorHandler.ts  // Error handling
├── services/            // Business logic
│   ├── emailService.ts  
│   ├── sweetsService.ts
│   ├── forumService.ts
│   └── botService.ts
├── storage/             // Data access layer
│   ├── index.ts         // Storage interface
│   └── domains/         // Domain-specific storage
└── jobs/                // Background jobs
    ├── coinExpiration.ts
    ├── emailDigests.ts
    └── botEngagement.ts
```

### API Design

#### RESTful Endpoints

```
GET    /api/users/:id           # Get user
POST   /api/auth/login          # Login
POST   /api/forum/threads       # Create thread
GET    /api/marketplace/items   # List items
PUT    /api/profile             # Update profile
DELETE /api/messages/:id        # Delete message
```

#### Request/Response Flow

```
Client Request
    ↓
Rate Limiting
    ↓
Authentication
    ↓
Input Validation
    ↓
Business Logic
    ↓
Data Access
    ↓
Response Formatting
    ↓
Client Response
```

### Service Layer

Services encapsulate business logic and coordinate between different domains:

```typescript
// Example service structure
class SweetsService {
  async awardCoins(userId: string, amount: number, trigger: string) {
    // Validate user
    // Check limits
    // Create transaction
    // Update wallet
    // Send notification
    // Log activity
  }
}
```

## Database Architecture

### Schema Design

```sql
-- Core tables structure
users
  ├── profiles (1:1)
  ├── user_wallet (1:1)
  ├── coin_transactions (1:N)
  └── forum_threads (1:N)

forum_threads
  ├── forum_replies (1:N)
  ├── forum_thread_likes (1:N)
  └── forum_categories (N:1)

marketplace_items (content)
  ├── content_purchases (1:N)
  ├── content_reviews (1:N)
  └── content_likes (1:N)
```

### Database Optimization

#### Indexes
```sql
-- Performance-critical indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_threads_category_created ON forum_threads(category_id, created_at DESC);
CREATE INDEX idx_transactions_user_created ON coin_transactions(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

#### Connection Pooling
```typescript
// Neon serverless configuration
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,  // Idle timeout
  connectionTimeoutMillis: 2000
});
```

### Data Integrity

- Foreign key constraints
- Check constraints for business rules
- Triggers for audit logging
- Transaction support for atomic operations

## Authentication Architecture

### Multi-Provider Strategy

```
User Registration/Login
        ↓
┌─────────────────┐
│  Provider Check │
└─────────────────┘
    ↙        ↘
Email/Pass   Google OAuth
    ↓            ↓
Firebase     Firebase
    ↓            ↓
Session      Session
Creation     Creation
    ↘        ↙
    Express Session
    (PostgreSQL Store)
```

### Session Management

```typescript
// Session configuration
{
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    pool: pgPool,
    tableName: 'sessions'
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: production,
    sameSite: 'lax'
  }
}
```

### Authorization

Role-based access control (RBAC):

| Role | Permissions |
|------|-------------|
| Guest | View public content |
| User | Create content, messaging |
| Moderator | Content moderation |
| Admin | Full system access |

## WebSocket Architecture

### Socket.IO Implementation

```typescript
// WebSocket events
io.on('connection', (socket) => {
  // Authentication
  socket.on('authenticate', async (token) => {
    const user = await verifyToken(token);
    socket.userId = user.id;
    socket.join(`user:${user.id}`);
  });

  // Dashboard updates
  socket.on('dashboard:subscribe', () => {
    socket.join('dashboard:updates');
  });

  // Messaging
  socket.on('message:send', async (data) => {
    // Process message
    io.to(`conversation:${data.conversationId}`).emit('message:new', message);
  });
});
```

### Real-Time Features

| Feature | Event | Description |
|---------|-------|-------------|
| Notifications | `notification:new` | New notification |
| Messages | `message:new` | New message received |
| Dashboard | `earnings:update` | Earnings changed |
| Forum | `thread:reply` | New reply posted |
| Presence | `user:online` | User online status |

## Caching Strategy

### Multi-Layer Caching

```
┌─────────────┐
│   Browser   │ → Service Worker Cache
└─────────────┘
       ↓
┌─────────────┐
│     CDN     │ → Static Assets (1 year)
└─────────────┘
       ↓
┌─────────────┐
│  Next.js    │ → ISR Cache (24 hours)
└─────────────┘
       ↓
┌─────────────┐
│React Query  │ → Client Cache (5 minutes)
└─────────────┘
       ↓
┌─────────────┐
│  Database   │ → Query Result Cache
└─────────────┘
```

### Cache Invalidation

```typescript
// Cache invalidation strategies
queryClient.invalidateQueries(['users', userId]);  // User-specific
queryClient.invalidateQueries(['forum']);          // Category-wide
queryClient.resetQueries();                        // Full reset
```

## Performance Optimizations

### Frontend Optimizations

1. **Code Splitting**
   ```typescript
   const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
     loading: () => <Skeleton />,
     ssr: false
   });
   ```

2. **Image Optimization**
   ```typescript
   <Image
     src={imageUrl}
     alt="Description"
     width={800}
     height={600}
     loading="lazy"
     placeholder="blur"
   />
   ```

3. **Bundle Optimization**
   - Tree shaking
   - Minification
   - Compression (gzip/brotli)

### Backend Optimizations

1. **Query Optimization**
   ```sql
   -- Use covering indexes
   CREATE INDEX idx_covering ON threads(category_id, created_at) 
   INCLUDE (title, user_id, view_count);
   ```

2. **N+1 Query Prevention**
   ```typescript
   // Eager loading with Drizzle
   const threads = await db.query.forumThreads.findMany({
     with: {
       user: true,
       category: true,
       replies: {
         limit: 5
       }
     }
   });
   ```

3. **Response Compression**
   ```typescript
   app.use(compression({
     filter: shouldCompress,
     threshold: 1024
   }));
   ```

### Database Optimizations

- Connection pooling
- Prepared statements
- Query result caching
- Index optimization
- Vacuum and analyze scheduling

## Security Architecture

### Defense in Depth

```
Layer 1: CDN (DDoS Protection)
           ↓
Layer 2: WAF (Web Application Firewall)
           ↓
Layer 3: Rate Limiting
           ↓
Layer 4: Input Validation
           ↓
Layer 5: Authentication/Authorization
           ↓
Layer 6: Business Logic Validation
           ↓
Layer 7: Database Constraints
```

### Security Measures

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries, ORM |
| XSS | Content Security Policy, sanitization |
| CSRF | CSRF tokens, SameSite cookies |
| Session Hijacking | Secure cookies, HTTPS only |
| Brute Force | Rate limiting, account lockout |
| DDoS | CDN protection, rate limiting |

### Security Headers

```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://www.googletagmanager.com"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Deployment Architecture

### Production Environment

```
┌──────────────────┐
│   Cloudflare     │ → CDN + DDoS Protection
└──────────────────┘
         ↓
┌──────────────────┐
│   Load Balancer  │ → Traffic Distribution
└──────────────────┘
         ↓
┌──────────────────┐
│   Web Servers    │ → Next.js + Express
│   (Auto-scaling) │
└──────────────────┘
         ↓
┌──────────────────┐
│   PostgreSQL     │ → Primary Database
│   (Neon)         │
└──────────────────┘
```

### Deployment Pipeline

```yaml
# CI/CD Pipeline
1. Code Push → GitHub
2. Tests Run → GitHub Actions
3. Build → Docker Image
4. Deploy → Production
5. Health Check → Monitoring
6. Rollback → If Failed
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=...
SMTP_HOST=smtp.hostinger.com
CDN_URL=https://cdn.yoforex.net
```

## Monitoring & Observability

### Monitoring Stack

```
Application Metrics → Custom Error Tracking
     ↓
Performance Metrics → Core Web Vitals
     ↓
Business Metrics → Dashboard Analytics
     ↓
Infrastructure → Server Monitoring
```

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | 99.9% | < 99.5% |
| Response Time | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 1% |
| Database Connections | < 80% | > 90% |
| Memory Usage | < 80% | > 90% |

### Logging Strategy

```typescript
// Structured logging
logger.info({
  event: 'user_login',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString()
});
```

### Health Checks

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
    email: await checkEmail()
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});
```

## Disaster Recovery

### Backup Strategy

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| Database | Daily | 30 days |
| User Files | Real-time | Indefinite |
| Configurations | On change | Version control |
| Logs | Daily | 90 days |

### Recovery Procedures

1. **Database Recovery**
   - Point-in-time recovery
   - Automated failover
   - Read replicas

2. **Application Recovery**
   - Blue-green deployment
   - Rollback capability
   - Feature flags

3. **Data Recovery**
   - Soft deletes
   - Audit trail
   - Version history

## Conclusion

The YoForex architecture is designed to be:
- **Scalable**: Handle growth from 10K to 1M+ users
- **Maintainable**: Clear separation of concerns
- **Performant**: Optimized at every layer
- **Secure**: Defense in depth approach
- **Reliable**: 99.9% uptime target

This architecture supports the platform's mission of creating a premier trading community while ensuring technical excellence and operational efficiency.