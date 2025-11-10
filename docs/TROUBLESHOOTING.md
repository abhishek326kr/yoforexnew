# Troubleshooting Guide

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Database Errors](#database-errors)
- [Authentication Problems](#authentication-problems)
- [Performance Issues](#performance-issues)
- [WebSocket Issues](#websocket-issues)
- [Email Delivery](#email-delivery)
- [Payment/Transaction Issues](#paymenttransaction-issues)
- [Forum Issues](#forum-issues)
- [Marketplace Issues](#marketplace-issues)
- [UI/Display Issues](#uidisplay-issues)
- [API Errors](#api-errors)
- [Server Errors](#server-errors)
- [Development Issues](#development-issues)
- [Production Issues](#production-issues)
- [Error Codes Reference](#error-codes-reference)
- [Debug Tools](#debug-tools)
- [Getting Help](#getting-help)

## Quick Diagnostics

### System Health Check

Run this command to diagnose common issues:

```bash
# Quick health check script
#!/bin/bash

echo "🔍 YoForex System Diagnostics"
echo "=============================="

# Check Node version
echo "✓ Node.js: $(node --version)"

# Check npm version
echo "✓ npm: $(npm --version)"

# Check PostgreSQL
pg_isready && echo "✓ PostgreSQL: Running" || echo "✗ PostgreSQL: Not running"

# Check Redis (if used)
redis-cli ping 2>/dev/null && echo "✓ Redis: Running" || echo "✗ Redis: Not installed/running"

# Check disk space
echo "✓ Disk Space: $(df -h / | awk 'NR==2 {print $4}') available"

# Check memory
echo "✓ Memory: $(free -h | awk 'NR==2 {print $7}') available"

# Test database connection
npm run db:test && echo "✓ Database: Connected" || echo "✗ Database: Connection failed"

# Check application
curl -s http://localhost:5000/health > /dev/null && echo "✓ Application: Running" || echo "✗ Application: Not running"

echo "=============================="
```

### Common Quick Fixes

| Symptom | Quick Fix |
|---------|-----------|
| App won't start | `rm -rf node_modules && npm install` |
| Database connection failed | Check DATABASE_URL in .env |
| Styles not loading | `npm run build` |
| WebSocket not connecting | Check firewall/proxy settings |
| Emails not sending | Verify SMTP credentials |

## Installation Issues

### Node.js Version Mismatch

**Error**: `The engine "node" is incompatible with this module`

**Solution**:
```bash
# Check current version
node --version

# Install correct version using nvm
nvm install 20
nvm use 20

# Or update globally
npm install -g n
n 20
```

### Package Installation Failures

**Error**: `npm ERR! code ERESOLVE`

**Solutions**:

1. **Clear npm cache**:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. **Use legacy peer deps**:
```bash
npm install --legacy-peer-deps
```

3. **Manual resolution**:
```json
// In package.json, add:
"overrides": {
  "package-name": "version"
}
```

### Permission Errors

**Error**: `EACCES: permission denied`

**Solutions**:

1. **Fix npm permissions**:
```bash
# Option 1: Change npm default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Option 2: Use npx
npx create-next-app
```

2. **Fix file permissions**:
```bash
# Fix project permissions
sudo chown -R $(whoami) .
chmod -R 755 .
```

### Build Failures

**Error**: `Build error occurred`

**Solutions**:

```bash
# 1. Clean build cache
rm -rf .next

# 2. Check for TypeScript errors
npm run type-check

# 3. Check environment variables
npm run check:env

# 4. Rebuild with verbose logging
npm run build -- --debug
```

## Database Errors

### Connection Refused

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solutions**:

1. **Start PostgreSQL**:
```bash
# macOS
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Windows
net start postgresql-x64-15
```

2. **Check PostgreSQL status**:
```bash
# Check if running
ps aux | grep postgres

# Check logs
tail -f /var/log/postgresql/*.log
```

3. **Verify connection string**:
```bash
# Test connection
psql postgresql://user:pass@localhost:5432/yoforex

# Common connection string issues:
# - Wrong password
# - Wrong port (default is 5432)
# - Wrong database name
# - Missing ?sslmode=require for cloud databases
```

### Migration Errors

**Error**: `Migration failed`

**Solutions**:

1. **Reset database**:
```bash
# Backup first!
pg_dump $DATABASE_URL > backup.sql

# Drop and recreate
npm run db:reset
npm run db:push
npm run db:seed
```

2. **Fix migration conflicts**:
```sql
-- Check current schema
\dt

-- Drop conflicting constraint
ALTER TABLE table_name DROP CONSTRAINT constraint_name;

-- Retry migration
npm run db:migrate
```

### Query Timeout

**Error**: `Query timeout`

**Solutions**:

1. **Optimize slow queries**:
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Add missing index
CREATE INDEX idx_table_column ON table(column);

-- Analyze tables
ANALYZE table_name;
```

2. **Increase timeout**:
```javascript
// In db configuration
const pool = new Pool({
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000,
  max: 20
});
```

## Authentication Problems

### Login Failures

**Error**: `Invalid credentials`

**Troubleshooting Steps**:

1. **Verify user exists**:
```sql
SELECT email, is_email_verified, status 
FROM users 
WHERE email = 'user@example.com';
```

2. **Reset password manually**:
```bash
npm run user:reset-password user@example.com
```

3. **Check session configuration**:
```javascript
// Verify session settings
console.log({
  secret: process.env.SESSION_SECRET ? 'Set' : 'Missing',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});
```

### Session Issues

**Error**: `Session expired` or `Not authenticated`

**Solutions**:

1. **Clear sessions**:
```sql
-- Clear all sessions
DELETE FROM sessions;

-- Clear specific user sessions
DELETE FROM sessions WHERE sess::json->>'userId' = 'user_id';
```

2. **Check session store**:
```javascript
// Debug session
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  next();
});
```

### OAuth Problems

**Error**: `Firebase auth error`

**Solutions**:

1. **Verify Firebase config**:
```bash
# Check environment variables
env | grep FIREBASE

# Test Firebase connection
npm run test:firebase
```

2. **Update Firebase settings**:
   - Check authorized domains in Firebase Console
   - Verify API keys are not restricted
   - Ensure OAuth redirect URIs are correct

## Performance Issues

### Slow Page Load

**Diagnosis**:
```bash
# Run Lighthouse audit
npm run lighthouse

# Check bundle size
npm run analyze
```

**Solutions**:

1. **Optimize images**:
```javascript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

2. **Enable caching**:
```javascript
// API response caching
res.setHeader('Cache-Control', 'public, max-age=3600');

// Static file caching (nginx)
location /_next/static {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

3. **Code splitting**:
```javascript
// Dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

### High Memory Usage

**Diagnosis**:
```bash
# Monitor memory
npm run monitor:memory

# Check for leaks
npm run test:memory-leak
```

**Solutions**:

1. **Fix memory leaks**:
```javascript
// Clear timers
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
}, []);

// Remove event listeners
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

2. **Optimize queries**:
```javascript
// Limit query results
const threads = await db.query.forumThreads.findMany({
  limit: 20, // Add pagination
  where: { ... },
  columns: { // Select only needed columns
    id: true,
    title: true,
    createdAt: true
  }
});
```

### Database Performance

**Slow queries diagnosis**:
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = on;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

**Solutions**:
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_threads_user_created 
ON forum_threads(user_id, created_at DESC);

-- Update statistics
VACUUM ANALYZE;

-- Optimize connection pooling
ALTER SYSTEM SET max_connections = 200;
```

## WebSocket Issues

### Connection Failed

**Error**: `WebSocket connection failed`

**Solutions**:

1. **Check WebSocket server**:
```javascript
// Server-side debugging
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});
```

2. **Client-side configuration**:
```javascript
// Correct WebSocket URL
const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

3. **Proxy/Firewall issues**:
```nginx
# Nginx WebSocket proxy
location /socket.io/ {
  proxy_pass http://localhost:5000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

### Messages Not Updating

**Debugging**:
```javascript
// Add logging
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('message', (data) => {
  console.log('Received:', data);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Email Delivery

### Emails Not Sending

**Error**: `Failed to send email`

**Troubleshooting**:

1. **Test SMTP connection**:
```javascript
// Test email script
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Error:', error);
  } else {
    console.log('SMTP Ready');
  }
});
```

2. **Common SMTP issues**:

| Provider | Issue | Solution |
|----------|-------|----------|
| Gmail | Less secure apps | Use app-specific password |
| Outlook | Authentication failed | Enable 2FA, use app password |
| SendGrid | Invalid API key | Regenerate API key |
| Custom | Port blocked | Try port 587 (TLS) or 465 (SSL) |

### Emails Going to Spam

**Solutions**:

1. **SPF Record**:
```dns
v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

2. **DKIM Setup**:
```dns
default._domainkey IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCS..."
```

3. **Email best practices**:
```javascript
// Good email headers
const mailOptions = {
  from: '"YoForex" <noreply@yoforex.net>',
  replyTo: 'support@yoforex.net',
  subject: 'Clear subject line',
  html: wellFormattedHtml,
  text: plainTextVersion,
  list: {
    unsubscribe: 'https://yoforex.net/unsubscribe'
  }
};
```

## Payment/Transaction Issues

### Coin Transaction Failures

**Error**: `Transaction failed`

**Debugging**:
```sql
-- Check user wallet
SELECT * FROM user_wallet WHERE user_id = 'user_id';

-- Check recent transactions
SELECT * FROM coin_transactions 
WHERE user_id = 'user_id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Solutions**:

1. **Fix balance inconsistencies**:
```sql
-- Recalculate balance from transactions
UPDATE user_wallet 
SET balance = (
  SELECT COALESCE(SUM(
    CASE WHEN type = 'credit' THEN amount 
         ELSE -amount END
  ), 0)
  FROM coin_transactions 
  WHERE user_id = 'user_id'
)
WHERE user_id = 'user_id';
```

2. **Handle concurrent transactions**:
```javascript
// Use transactions with row locking
await db.transaction(async (tx) => {
  // Lock wallet row
  const wallet = await tx.query.userWallet.findFirst({
    where: { userId },
    for: 'update'
  });
  
  // Perform operations
  // ...
});
```

### Withdrawal Issues

**Common problems and solutions**:

| Issue | Cause | Solution |
|-------|-------|----------|
| Pending too long | Manual approval required | Check admin queue |
| Insufficient balance | Locked coins | Check vault status |
| Invalid payment details | User error | Validate before submission |
| Fee calculation wrong | Tier not updated | Recalculate loyalty tier |

## Forum Issues

### Thread Not Posting

**Debugging checklist**:
- [ ] Check rate limits
- [ ] Verify user permissions
- [ ] Check content length limits
- [ ] Review moderation rules
- [ ] Check for profanity filter

**Solutions**:
```javascript
// Debug forum posting
console.log({
  userCanPost: user.canCreateThread,
  rateLimitRemaining: getRateLimit(userId, 'thread'),
  contentLength: content.length,
  validCategory: await categoryExists(categoryId)
});
```

### Search Not Working

**Solutions**:

1. **Rebuild search index**:
```sql
-- Rebuild full-text search index
REINDEX INDEX idx_threads_search;

-- Update search vectors
UPDATE forum_threads 
SET search_vector = to_tsvector('english', title || ' ' || content);
```

2. **Fix search query**:
```javascript
// Escape special characters
const sanitizedQuery = query.replace(/[^\w\s]/gi, '');
```

## Marketplace Issues

### Upload Failures

**Error**: `File upload failed`

**Solutions**:

1. **Check file limits**:
```javascript
// Increase upload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer configuration
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});
```

2. **Storage permissions**:
```bash
# Check upload directory
ls -la uploads/

# Fix permissions
chmod 755 uploads/
chown www-data:www-data uploads/
```

### Purchase Not Processing

**Debug steps**:
```javascript
// 1. Check user balance
const wallet = await getUserWallet(userId);
console.log('Balance:', wallet.balance, 'Price:', item.price);

// 2. Check item availability
const item = await getItem(itemId);
console.log('Available:', item.status === 'active');

// 3. Check transaction logs
const logs = await getTransactionLogs(userId, itemId);
console.log('Previous attempts:', logs);
```

## UI/Display Issues

### Styles Not Loading

**Solutions**:

1. **Rebuild CSS**:
```bash
# Rebuild Tailwind
npm run build:css

# Clear Next.js cache
rm -rf .next

# Rebuild application
npm run build
```

2. **Check Tailwind config**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  // ...
};
```

### Responsive Issues

**Testing**:
```javascript
// Add viewport debugger
useEffect(() => {
  const logViewport = () => {
    console.log({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    });
  };
  
  window.addEventListener('resize', logViewport);
  logViewport();
}, []);
```

### Dark Mode Issues

**Common fixes**:
```css
/* Ensure dark mode variables are defined */
:root {
  --background: 255 255 255;
  --foreground: 0 0 0;
}

.dark {
  --background: 0 0 0;
  --foreground: 255 255 255;
}

/* Use CSS variables consistently */
.component {
  background: rgb(var(--background));
  color: rgb(var(--foreground));
}
```

## API Errors

### 400 Bad Request

**Common causes**:
- Invalid JSON in request body
- Missing required fields
- Invalid data types

**Debug**:
```javascript
// Add request logging
app.use((req, res, next) => {
  console.log({
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  next();
});
```

### 401 Unauthorized

**Solutions**:
```javascript
// Check authentication
if (!req.session?.userId) {
  return res.status(401).json({ error: 'Not authenticated' });
}

// Verify session is valid
const user = await getUserById(req.session.userId);
if (!user) {
  req.session.destroy();
  return res.status(401).json({ error: 'Invalid session' });
}
```

### 429 Too Many Requests

**Solutions**:
```javascript
// Adjust rate limits
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increase limit
  skip: (req) => req.user?.role === 'admin' // Skip for admins
});
```

### 500 Internal Server Error

**Debugging**:
```javascript
// Enhanced error handler
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  // Send appropriate response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message,
    requestId: req.id
  });
});
```

## Server Errors

### Memory Leaks

**Detection**:
```javascript
// Memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}, 60000);
```

**Common leak sources**:
- Unclosed database connections
- Event listeners not removed
- Large arrays/objects in closure
- Circular references

### CPU High Usage

**Diagnosis**:
```bash
# Profile Node.js
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Check process
top -p $(pgrep node)
```

**Solutions**:
- Use worker threads for CPU-intensive tasks
- Implement caching
- Optimize algorithms
- Add pagination

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solutions**:
```bash
# Find process using port
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
PORT=3001 npm run dev
```

## Development Issues

### Hot Reload Not Working

**Solutions**:

1. **Check file watching**:
```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300
    };
    return config;
  }
};
```

2. **Clear webpack cache**:
```bash
rm -rf .next/cache
```

### TypeScript Errors

**Common fixes**:
```typescript
// Missing types
npm install --save-dev @types/node @types/react

// Type assertion
const element = document.getElementById('id') as HTMLInputElement;

// Ignore line
// @ts-ignore

// Ignore file
// @ts-nocheck
```

### ESLint Issues

**Solutions**:
```javascript
// Disable rule for line
// eslint-disable-next-line no-unused-vars

// Disable rule for file
/* eslint-disable no-console */

// Fix automatically
npm run lint:fix
```

## Production Issues

### Deploy Failures

**Common issues**:

| Error | Solution |
|-------|----------|
| Build failed | Check build logs, verify environment variables |
| Database migration failed | Run migrations manually, check connection |
| Health check failed | Verify health endpoint, check startup time |
| Out of memory | Increase memory limit, optimize build |

### SSL Certificate Issues

**Solutions**:

1. **Certificate expired**:
```bash
# Renew with Certbot
certbot renew

# Check expiration
echo | openssl s_client -servername yoforex.net -connect yoforex.net:443 2>/dev/null | openssl x509 -noout -dates
```

2. **Mixed content warnings**:
```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### Monitoring Alerts

**Setting up alerts**:
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: await checkMemory()
  };
  
  const healthy = Object.values(checks).every(check => check.status === 'ok');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});
```

## Error Codes Reference

### Application Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| E001 | Database connection failed | Check DATABASE_URL |
| E002 | Authentication failed | Check credentials |
| E003 | Session expired | Re-login required |
| E004 | Rate limit exceeded | Wait and retry |
| E005 | Validation error | Check input data |
| E006 | Insufficient permissions | Check user role |
| E007 | Resource not found | Verify ID/path |
| E008 | Payment failed | Check balance |
| E009 | Email delivery failed | Check SMTP config |
| E010 | File upload failed | Check file size/type |

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | No permission |
| 404 | Not Found | Wrong URL |
| 409 | Conflict | Duplicate entry |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Code bug |
| 502 | Bad Gateway | Server down |
| 503 | Service Unavailable | Maintenance |

## Debug Tools

### Browser DevTools

```javascript
// Debug in console
localStorage.debug = '*'; // Enable all debug logs
localStorage.debug = 'app:*'; // App logs only

// Network tab
// - Check failed requests (red)
// - Inspect request/response headers
// - Check response time

// Application tab
// - Check cookies
// - Check localStorage
// - Check sessionStorage
```

### Database Tools

```bash
# pgAdmin - GUI tool
# Install from pgadmin.org

# psql commands
psql $DATABASE_URL

# Useful queries
\l  # List databases
\dt # List tables
\d table_name # Describe table
\x  # Toggle expanded display

# Export query results
\copy (SELECT * FROM users) TO 'users.csv' CSV HEADER;
```

### Monitoring Tools

```javascript
// Custom performance monitoring
class PerformanceMonitor {
  static mark(name) {
    performance.mark(name);
  }
  
  static measure(name, start, end) {
    performance.measure(name, start, end);
    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
  }
}

// Usage
PerformanceMonitor.mark('api-start');
await apiCall();
PerformanceMonitor.mark('api-end');
PerformanceMonitor.measure('API Call', 'api-start', 'api-end');
```

## Getting Help

### Self-Help Resources

1. **Documentation**:
   - [Setup Guide](./SETUP.md)
   - [API Reference](./API.md)
   - [Development Guide](./DEVELOPMENT.md)

2. **Logs**:
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Database logs
tail -f /var/log/postgresql/*.log

# System logs
journalctl -u yoforex -f
```

3. **Debug Mode**:
```bash
# Run with debug output
DEBUG=* npm run dev

# Specific namespace
DEBUG=app:* npm run dev
```

### Community Support

- **Forum**: [yoforex.net/forum/help](https://yoforex.net/forum/help)
- **Discord**: [discord.gg/yoforex](https://discord.gg/yoforex)
- **GitHub Issues**: [github.com/yoforex/issues](https://github.com/yoforex/issues)

### Professional Support

For critical issues:
- **Email**: support@yoforex.net
- **Priority Support**: Available for premium members
- **Response Time**: 24-48 hours (standard), 4 hours (priority)

### Reporting Bugs

When reporting issues, include:

```markdown
## Environment
- OS: [e.g., Ubuntu 22.04]
- Node version: [e.g., 20.10.0]
- Database: [e.g., PostgreSQL 15]
- Browser: [e.g., Chrome 120]

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Error Messages
```
Paste any error messages here
```

## Screenshots
If applicable

## Logs
```
Relevant log entries
```
```

---

<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
💡 <strong>Pro Tip:</strong> Most issues can be resolved by checking logs, verifying environment variables, and ensuring all services are running. When in doubt, restart and check logs!
</div>

---

*Last Updated: January 2025 | Troubleshooting Guide v2.0*