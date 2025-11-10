# Development Guide

## Table of Contents
- [Development Philosophy](#development-philosophy)
- [Code Style Guide](#code-style-guide)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [React/Next.js Patterns](#reactnextjs-patterns)
  - [Database Patterns](#database-patterns)
  - [API Design](#api-design)
- [Git Workflow](#git-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Component Patterns](#component-patterns)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Performance Best Practices](#performance-best-practices)
- [Security Guidelines](#security-guidelines)
- [Development Tools](#development-tools)
- [Debugging Tips](#debugging-tips)

## Development Philosophy

### Core Principles

1. **Type Safety First**: Use TypeScript everywhere, avoid `any`
2. **Composition Over Inheritance**: Prefer hooks and functional components
3. **Fail Fast**: Validate early, throw meaningful errors
4. **Performance by Default**: Optimize from the start
5. **Security in Depth**: Multiple layers of protection
6. **Documentation as Code**: Keep docs next to code

### Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Modern React patterns, better performance |
| TypeScript | Type safety, better DX, self-documenting |
| Drizzle ORM | Type-safe, performant, good DX |
| TanStack Query | Powerful data fetching, caching |
| Tailwind CSS | Utility-first, consistent styling |
| Express.js API | Flexibility, ecosystem, WebSockets |

## Code Style Guide

### TypeScript Guidelines

#### Type Definitions

```typescript
// ✅ GOOD: Explicit types, interfaces for objects
interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

type UserRole = 'user' | 'moderator' | 'admin';

// ❌ BAD: Using any, implicit types
const user: any = { ... };
const role = 'admin'; // Should be typed
```

#### Naming Conventions

```typescript
// Interfaces: PascalCase with descriptive names
interface ForumThread { ... }
interface UserProfile { ... }

// Types: PascalCase for objects, camelCase for primitives
type UserId = string;
type ThreadStatus = 'open' | 'closed' | 'locked';

// Enums: PascalCase with UPPER_SNAKE members
enum NotificationType {
  THREAD_REPLY = 'thread_reply',
  PRIVATE_MESSAGE = 'private_message'
}

// Functions: camelCase, verb prefixes
function getUserById(id: string): User { ... }
function createThread(data: CreateThreadInput): Thread { ... }

// Constants: UPPER_SNAKE for configs, camelCase for others
const MAX_THREAD_LENGTH = 10000;
const defaultUser = { ... };

// Components: PascalCase
const UserProfile: React.FC<Props> = () => { ... };
```

#### Function Patterns

```typescript
// ✅ GOOD: Typed parameters and return values
async function createUser(
  input: CreateUserInput
): Promise<User> {
  // Validate input
  const validated = userSchema.parse(input);
  
  // Process
  const user = await db.users.create(validated);
  
  // Return typed result
  return user;
}

// ✅ GOOD: Error handling
async function safeCreateUser(
  input: CreateUserInput
): Promise<Result<User, Error>> {
  try {
    const user = await createUser(input);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error };
  }
}

// ❌ BAD: Untyped, no error handling
async function createUser(input) {
  return db.users.create(input);
}
```

### React/Next.js Patterns

#### Component Structure

```typescript
// ✅ GOOD: Organized component
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import type { Thread } from '@/types';

interface ThreadListProps {
  categoryId: string;
  limit?: number;
}

export function ThreadList({ 
  categoryId, 
  limit = 10 
}: ThreadListProps) {
  // Hooks at the top
  const [filter, setFilter] = useState('recent');
  
  // Data fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['threads', categoryId, filter],
    queryFn: () => fetchThreads(categoryId, filter, limit)
  });
  
  // Event handlers
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);
  
  // Early returns
  if (isLoading) return <ThreadListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;
  
  // Main render
  return (
    <div className="space-y-4">
      <ThreadFilter value={filter} onChange={handleFilterChange} />
      {data.map(thread => (
        <ThreadCard key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
```

#### Custom Hooks

```typescript
// ✅ GOOD: Reusable custom hook
function useThreads(categoryId: string, options?: ThreadOptions) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['threads', categoryId, options],
    queryFn: () => api.threads.list(categoryId, options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const createMutation = useMutation({
    mutationFn: api.threads.create,
    onSuccess: (newThread) => {
      // Update cache
      queryClient.setQueryData(
        ['threads', categoryId, options],
        (old: Thread[]) => [newThread, ...old]
      );
    }
  });
  
  return {
    threads: query.data,
    isLoading: query.isLoading,
    error: query.error,
    createThread: createMutation.mutate,
    isCreating: createMutation.isPending
  };
}

// Usage
function ThreadManager({ categoryId }: Props) {
  const { threads, createThread, isLoading } = useThreads(categoryId);
  // ...
}
```

#### Server Components

```typescript
// ✅ GOOD: Server component for data fetching
// app/forum/[category]/page.tsx
import { Suspense } from 'react';
import { ThreadList } from './ThreadList';

export default async function CategoryPage({ 
  params 
}: { 
  params: { category: string } 
}) {
  // Fetch data on server
  const category = await getCategory(params.category);
  
  if (!category) {
    notFound();
  }
  
  return (
    <div>
      <h1>{category.name}</h1>
      <Suspense fallback={<ThreadListSkeleton />}>
        <ThreadList categoryId={category.id} />
      </Suspense>
    </div>
  );
}

// Parallel data fetching
export async function generateMetadata({ params }) {
  const category = await getCategory(params.category);
  return {
    title: category?.name,
    description: category?.description
  };
}
```

### Database Patterns

#### Query Patterns

```typescript
// ✅ GOOD: Efficient queries with proper joins
async function getThreadWithReplies(threadId: string) {
  return await db.query.forumThreads.findFirst({
    where: eq(forumThreads.id, threadId),
    with: {
      user: {
        columns: {
          id: true,
          username: true,
          avatar: true
        }
      },
      replies: {
        orderBy: [asc(forumReplies.createdAt)],
        limit: 50,
        with: {
          user: true
        }
      },
      category: true
    }
  });
}

// ✅ GOOD: Transactions for consistency
async function purchaseItem(userId: string, itemId: string) {
  return await db.transaction(async (tx) => {
    // Check balance
    const wallet = await tx.query.userWallet.findFirst({
      where: eq(userWallet.userId, userId),
      for: 'update' // Lock row
    });
    
    if (wallet.balance < item.price) {
      throw new Error('Insufficient balance');
    }
    
    // Deduct coins
    await tx.update(userWallet)
      .set({ balance: wallet.balance - item.price })
      .where(eq(userWallet.userId, userId));
    
    // Record purchase
    const purchase = await tx.insert(contentPurchases)
      .values({ userId, contentId: itemId, price: item.price })
      .returning();
    
    // Record transaction
    await tx.insert(coinTransactions).values({
      userId,
      amount: -item.price,
      type: 'debit',
      trigger: 'marketplace.purchase.item',
      referenceId: purchase[0].id
    });
    
    return purchase[0];
  });
}
```

#### Migration Patterns

```sql
-- migrations/001_add_user_preferences.sql
-- Up migration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_users_preferences 
ON users USING gin(preferences);

-- Down migration (in separate file)
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
DROP INDEX IF EXISTS idx_users_preferences;
```

### API Design

#### RESTful Patterns

```typescript
// ✅ GOOD: RESTful routes with proper methods
app.get('/api/threads', getThreads);        // List
app.get('/api/threads/:id', getThread);     // Get one
app.post('/api/threads', createThread);     // Create
app.put('/api/threads/:id', updateThread);  // Update
app.delete('/api/threads/:id', deleteThread); // Delete

// ✅ GOOD: Nested resources
app.get('/api/threads/:threadId/replies', getReplies);
app.post('/api/threads/:threadId/replies', createReply);

// ❌ BAD: Non-RESTful
app.post('/api/getThreads', ...);  // Should be GET
app.get('/api/deleteThread/:id', ...); // Should be DELETE
```

#### Request Validation

```typescript
// ✅ GOOD: Validate and sanitize inputs
import { z } from 'zod';

const createThreadSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(10).max(10000),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).max(5).optional()
});

async function createThread(req: Request, res: Response) {
  try {
    // Validate body
    const input = createThreadSchema.parse(req.body);
    
    // Sanitize HTML
    input.content = sanitizeHtml(input.content, {
      allowedTags: ['b', 'i', 'u', 'a', 'p', 'br'],
      allowedAttributes: { a: ['href'] }
    });
    
    // Check permissions
    if (!req.user?.canCreateThread) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Create thread
    const thread = await threadService.create(input, req.user.id);
    
    return res.status(201).json(thread);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    throw error; // Let error handler catch
  }
}
```

## Git Workflow

### Branch Strategy

```bash
main
├── develop
│   ├── feature/add-payment-gateway
│   ├── feature/improve-search
│   └── feature/mobile-app
├── hotfix/security-patch
└── release/v2.0.0
```

### Commit Conventions

```bash
# Format: <type>(<scope>): <subject>
# Types: feat, fix, docs, style, refactor, test, chore

# ✅ GOOD commits
feat(forum): add thread pinning functionality
fix(auth): resolve session timeout issue
docs(api): update authentication endpoints
refactor(database): optimize user queries
test(marketplace): add purchase flow tests
chore(deps): update dependencies

# ❌ BAD commits
update stuff
fixed bug
WIP
changes
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No sensitive data exposed
```

## Testing Guidelines

### Test Structure

```typescript
// ✅ GOOD: Descriptive, organized tests
describe('ThreadService', () => {
  describe('createThread', () => {
    it('should create a thread with valid input', async () => {
      // Arrange
      const input = {
        title: 'Test Thread',
        content: 'Test content',
        categoryId: 'cat_123'
      };
      const userId = 'user_123';
      
      // Act
      const thread = await threadService.createThread(input, userId);
      
      // Assert
      expect(thread).toMatchObject({
        title: input.title,
        content: input.content,
        userId
      });
      expect(thread.id).toBeDefined();
    });
    
    it('should throw error for invalid title', async () => {
      const input = { title: '', content: 'Valid', categoryId: 'cat_123' };
      
      await expect(
        threadService.createThread(input, 'user_123')
      ).rejects.toThrow('Title is required');
    });
    
    it('should award coins on creation', async () => {
      const spy = jest.spyOn(coinService, 'award');
      
      await threadService.createThread(validInput, userId);
      
      expect(spy).toHaveBeenCalledWith(userId, 25, 'forum.thread.created');
    });
  });
});
```

### Integration Tests

```typescript
// ✅ GOOD: Test complete flows
describe('Forum API Integration', () => {
  let app: Application;
  let token: string;
  
  beforeAll(async () => {
    app = await createTestApp();
    token = await loginTestUser();
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe('POST /api/threads', () => {
    it('should create thread and return 201', async () => {
      const response = await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Integration Test Thread',
          content: 'Test content',
          categoryId: testCategoryId
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Integration Test Thread');
    });
  });
});
```

## Component Patterns

### Compound Components

```typescript
// ✅ GOOD: Flexible compound component
interface CardContextValue {
  variant: 'default' | 'bordered';
}

const CardContext = createContext<CardContextValue>({ variant: 'default' });

export function Card({ children, variant = 'default' }: CardProps) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={cn('rounded-lg', variant === 'bordered' && 'border')}>
        {children}
      </div>
    </CardContext.Provider>
  );
}

Card.Header = function CardHeader({ children }: { children: ReactNode }) {
  const { variant } = useContext(CardContext);
  return (
    <div className={cn('p-4', variant === 'bordered' && 'border-b')}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children }: { children: ReactNode }) {
  return <div className="p-4">{children}</div>;
};

// Usage
<Card variant="bordered">
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### Render Props

```typescript
// ✅ GOOD: Flexible render prop pattern
interface DataFetcherProps<T> {
  url: string;
  children: (data: T, loading: boolean, error: Error | null) => ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const { data, isLoading, error } = useQuery<T>({
    queryKey: [url],
    queryFn: () => fetch(url).then(r => r.json())
  });
  
  return <>{children(data, isLoading, error)}</>;
}

// Usage
<DataFetcher url="/api/user">
  {(user, loading, error) => {
    if (loading) return <Spinner />;
    if (error) return <Error message={error.message} />;
    return <UserProfile user={user} />;
  }}
</DataFetcher>
```

## State Management

### React Query for Server State

```typescript
// ✅ GOOD: Centralized query keys and options
export const threadKeys = {
  all: ['threads'] as const,
  lists: () => [...threadKeys.all, 'list'] as const,
  list: (filters: ThreadFilters) => [...threadKeys.lists(), filters] as const,
  details: () => [...threadKeys.all, 'detail'] as const,
  detail: (id: string) => [...threadKeys.details(), id] as const,
};

// Custom hook with optimistic updates
export function useThreadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.threads.create,
    onMutate: async (newThread) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: threadKeys.lists() });
      
      // Snapshot current value
      const previous = queryClient.getQueryData(threadKeys.lists());
      
      // Optimistically update
      queryClient.setQueryData(threadKeys.lists(), (old: Thread[]) => {
        return [{ ...newThread, id: 'temp', pending: true }, ...old];
      });
      
      return { previous };
    },
    onError: (err, newThread, context) => {
      // Rollback on error
      queryClient.setQueryData(threadKeys.lists(), context?.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    }
  });
}
```

### Context for Client State

```typescript
// ✅ GOOD: Well-structured context
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

interface AppContextValue extends AppState {
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    theme: 'light',
    sidebarOpen: false
  });
  
  const value = useMemo(() => ({
    ...state,
    setUser: (user: User | null) => setState(s => ({ ...s, user })),
    toggleTheme: () => setState(s => ({ 
      ...s, 
      theme: s.theme === 'light' ? 'dark' : 'light' 
    })),
    toggleSidebar: () => setState(s => ({ 
      ...s, 
      sidebarOpen: !s.sidebarOpen 
    }))
  }), [state]);
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

## Error Handling

### Error Boundaries

```typescript
// ✅ GOOD: Comprehensive error boundary
class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to error service
    console.error('Error caught by boundary:', error, info);
    
    // Send to monitoring
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      );
    }
    
    return this.props.children;
  }
}
```

### API Error Handling

```typescript
// ✅ GOOD: Centralized error handling
class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiRequest<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new APIError(
        response.status,
        error.code || 'UNKNOWN',
        error.message || 'Request failed',
        error.details
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof APIError) throw error;
    
    throw new APIError(
      500,
      'NETWORK_ERROR',
      'Network request failed',
      error
    );
  }
}

// Usage with proper error handling
function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiRequest<User>(`/api/users/${id}`),
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof APIError && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    }
  });
}
```

## Performance Best Practices

### Code Splitting

```typescript
// ✅ GOOD: Dynamic imports for large components
const AdminDashboard = dynamic(
  () => import('@/components/admin/Dashboard'),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

// Route-based splitting
const routes = [
  {
    path: '/admin',
    component: lazy(() => import('./pages/Admin'))
  },
  {
    path: '/marketplace',
    component: lazy(() => import('./pages/Marketplace'))
  }
];
```

### Memoization

```typescript
// ✅ GOOD: Proper memoization
const ExpensiveComponent = memo(({ data, filters }: Props) => {
  // Memoize expensive computations
  const filteredData = useMemo(() => {
    return data.filter(item => {
      return filters.every(filter => filter(item));
    });
  }, [data, filters]);
  
  // Memoize callbacks
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);
  
  return (
    <div>
      {filteredData.map(item => (
        <Item key={item.id} onClick={handleClick} {...item} />
      ))}
    </div>
  );
});

// Custom comparison function
const ThreadList = memo(
  ({ threads }: { threads: Thread[] }) => { ... },
  (prevProps, nextProps) => {
    // Only re-render if thread count changes
    return prevProps.threads.length === nextProps.threads.length;
  }
);
```

### Image Optimization

```typescript
// ✅ GOOD: Optimized image loading
import Image from 'next/image';

function ProductImage({ src, alt }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      placeholder="blur"
      blurDataURL={generateBlurDataURL(src)}
      loading="lazy"
      sizes="(max-width: 768px) 100vw, 
             (max-width: 1200px) 50vw, 
             400px"
    />
  );
}

// Generate blur placeholder
function generateBlurDataURL(src: string): string {
  // Base64 encoded 10x10px blurred version
  return 'data:image/jpeg;base64,...';
}
```

## Security Guidelines

### Input Validation

```typescript
// ✅ GOOD: Comprehensive validation
import DOMPurify from 'isomorphic-dompurify';

function validateAndSanitize(input: any): SafeInput {
  // Type validation
  const schema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(10000),
    tags: z.array(z.string()).max(5)
  });
  
  const validated = schema.parse(input);
  
  // XSS prevention
  validated.content = DOMPurify.sanitize(validated.content, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'p', 'br', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target']
  });
  
  // SQL injection prevention (handled by ORM)
  // Additional business logic validation
  if (containsProfanity(validated.content)) {
    throw new Error('Content contains inappropriate language');
  }
  
  return validated;
}
```

### Authentication & Authorization

```typescript
// ✅ GOOD: Middleware-based auth
export function requireAuth(
  requiredRole?: UserRole
): RequestHandler {
  return async (req, res, next) => {
    try {
      // Check session
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get user
      const user = await getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Check role
      if (requiredRole && !hasRole(user, requiredRole)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Attach to request
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Auth check failed' });
    }
  };
}

// Usage
app.post('/api/admin/users/ban', 
  requireAuth('admin'),
  banUserHandler
);
```

### Data Protection

```typescript
// ✅ GOOD: Sensitive data handling
class UserService {
  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { profile: true }
    });
    
    // Never expose sensitive fields
    const { 
      password_hash,
      email,
      ip_address,
      session_token,
      ...publicData 
    } = user;
    
    return publicData;
  }
  
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  async verifyPassword(
    password: string, 
    hash: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
```

## Development Tools

### VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense",
    "naumovs.color-highlight"
  ]
}
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:api": "nodemon server/index.ts",
    "dev:db": "drizzle-kit studio",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "analyze": "ANALYZE=true next build"
  }
}
```

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    },
    {
      "name": "Next.js: debug client",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

## Debugging Tips

### Console Debugging

```typescript
// ✅ GOOD: Structured logging
const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 [DEBUG] ${message}`, data);
    }
  },
  info: (message: string, data?: any) => {
    console.log(`ℹ️ [INFO] ${message}`, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [WARN] ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [ERROR] ${message}`, error);
  }
};

// Usage
logger.debug('User query', { userId, filters });
logger.error('Database query failed', error);
```

### React DevTools

```typescript
// ✅ GOOD: Debug-friendly component names
export const ThreadList = memo(
  forwardRef<HTMLDivElement, ThreadListProps>(
    function ThreadList(props, ref) {
      // Component logic
    }
  )
);

// Add display name for debugging
ThreadList.displayName = 'ThreadList';

// Debug custom hooks
export function useThreads(categoryId: string) {
  // Add debug value
  useDebugValue(categoryId ? `Category: ${categoryId}` : 'All threads');
  
  // Hook logic
}
```

### Database Debugging

```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = on;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Analyze query plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM forum_threads 
WHERE category_id = '123' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Performance Profiling

```typescript
// ✅ GOOD: Performance monitoring
function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  
  try {
    const result = fn();
    const duration = performance.now() - start;
    
    console.log(`⏱️ ${name} took ${duration.toFixed(2)}ms`);
    
    // Report to analytics
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'timing_complete', {
        name,
        value: Math.round(duration)
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`⏱️ ${name} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}

// Usage
const threads = measurePerformance('fetch_threads', () => {
  return fetchThreads(categoryId);
});
```

## Summary

Following these development guidelines ensures:

1. **Consistency**: Uniform code style across the team
2. **Maintainability**: Easy to understand and modify
3. **Performance**: Optimized from the start
4. **Security**: Multiple layers of protection
5. **Quality**: Comprehensive testing and validation

Remember:
- Write code for humans, not machines
- Optimize for clarity, then performance
- Test early, test often
- Document as you go
- Security is everyone's responsibility