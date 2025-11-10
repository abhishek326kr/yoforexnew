# Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Deployment Options](#deployment-options)
- [Production Requirements](#production-requirements)
- [Environment Configuration](#environment-configuration)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Methods](#deployment-methods)
  - [Replit Deployments](#replit-deployments)
  - [VPS Deployment](#vps-deployment)
  - [Docker Deployment](#docker-deployment)
  - [Kubernetes Deployment](#kubernetes-deployment)
- [Database Migration](#database-migration)
- [SSL Configuration](#ssl-configuration)
- [CDN Setup](#cdn-setup)
- [Monitoring Setup](#monitoring-setup)
- [Backup Procedures](#backup-procedures)
- [Scaling Considerations](#scaling-considerations)
- [Rollback Strategy](#rollback-strategy)
- [Post-Deployment](#post-deployment)

## Overview

YoForex can be deployed to various environments, from simple VPS setups to complex Kubernetes clusters. This guide covers all deployment scenarios with best practices for production environments.

### Deployment Architecture

```
Internet
    │
    ▼
Cloudflare (CDN/DDoS Protection)
    │
    ▼
Load Balancer (nginx/HAProxy)
    │
    ├──► Web Server 1 (Next.js + Express)
    ├──► Web Server 2 (Next.js + Express)
    └──► Web Server N (Next.js + Express)
         │
         ├──► PostgreSQL (Primary)
         ├──► PostgreSQL (Read Replica)
         └──► Object Storage (S3)
```

## Deployment Options

### Comparison Matrix

| Method | Complexity | Cost | Scalability | Best For |
|--------|-----------|------|-------------|----------|
| Replit | ⭐ | $$ | Auto | Quick deployment, testing |
| VPS | ⭐⭐ | $ | Manual | Small to medium traffic |
| Docker | ⭐⭐⭐ | $$ | Good | Consistent environments |
| Kubernetes | ⭐⭐⭐⭐⭐ | $$$ | Excellent | Large scale, high availability |

## Production Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4GB | 8GB+ |
| Storage | 20GB SSD | 50GB+ SSD |
| Bandwidth | 1TB/month | Unmetered |
| Node.js | 18.0.0 | 20.0.0+ |
| PostgreSQL | 13 | 15+ |

### Software Dependencies

```bash
# Required software
node >= 18.0.0
npm >= 9.0.0
postgresql >= 13
nginx >= 1.18
pm2 >= 5.0.0
git >= 2.0.0

# Optional but recommended
redis >= 6.0
fail2ban >= 0.11
certbot >= 1.0
```

## Environment Configuration

### Production Environment Variables

```bash
# .env.production
# ==========================================
# Application
# ==========================================
NODE_ENV=production
PORT=5000
BASE_URL=https://yoforex.net
API_URL=https://yoforex.net/api
WS_URL=wss://yoforex.net

# ==========================================
# Database
# ==========================================
DATABASE_URL=postgresql://user:pass@host:5432/yoforex?sslmode=require
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true

# Read replica for queries (optional)
DATABASE_READ_URL=postgresql://user:pass@read-host:5432/yoforex

# ==========================================
# Sessions
# ==========================================
SESSION_SECRET=very-long-random-production-secret-min-32-chars
SESSION_NAME=yoforex.sid
SESSION_SECURE=true
SESSION_HTTPONLY=true
SESSION_SAMESITE=lax
SESSION_MAX_AGE=2592000000

# ==========================================
# Firebase (Production)
# ==========================================
FIREBASE_PROJECT_ID=yoforex-production
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account"...}'

# ==========================================
# Email (Production SMTP)
# ==========================================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yoforex.net
SMTP_FROM_NAME=YoForex

# ==========================================
# Object Storage
# ==========================================
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=yoforex-production
S3_CDN_URL=https://cdn.yoforex.net

# ==========================================
# Security
# ==========================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
CSRF_ENABLED=true
CORS_ORIGIN=https://yoforex.net

# ==========================================
# Monitoring
# ==========================================
SENTRY_DSN=https://key@sentry.io/project
GA_MEASUREMENT_ID=G-XXXXXXXXXX
LOG_LEVEL=error
ENABLE_METRICS=true

# ==========================================
# Performance
# ==========================================
ENABLE_CACHE=true
CACHE_TTL=3600
ENABLE_COMPRESSION=true
ENABLE_CLUSTERING=true
CLUSTER_WORKERS=4
```

## Pre-Deployment Checklist

### Code Preparation

```bash
# 1. Run tests
npm test
npm run test:e2e

# 2. Build production bundle
npm run build

# 3. Check bundle size
npm run analyze

# 4. Verify environment variables
npm run check:env

# 5. Update version
npm version patch/minor/major

# 6. Create git tag
git tag v1.0.0
git push origin v1.0.0
```

### Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials encrypted
- [ ] SSL certificates configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation in place
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

### Performance Checklist

- [ ] Images optimized
- [ ] Code minified
- [ ] Gzip/Brotli compression enabled
- [ ] CDN configured
- [ ] Database indexed properly
- [ ] Caching strategy implemented
- [ ] Service workers configured
- [ ] Lazy loading enabled

## Deployment Methods

### Replit Deployments

#### 1. Configure Replit

```toml
# .replit
run = "npm run start:production"

[env]
NODE_ENV = "production"

[nix]
channel = "stable-23_11"

[deployment]
run = ["npm", "run", "start:production"]
deploymentTarget = "cloudrun"
ignorePorts = false
```

#### 2. Set Secrets

```bash
# In Replit Secrets tab
DATABASE_URL=your-production-db-url
SESSION_SECRET=your-production-secret
# ... other production secrets
```

#### 3. Deploy

```bash
# Using Replit CLI
replit deployments create \
  --name "yoforex-production" \
  --deploy-on-push

# Or use Replit UI
# Click "Deploy" button in Replit interface
```

### VPS Deployment

#### 1. Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install build tools
sudo apt install -y build-essential git
```

#### 2. Application Setup

```bash
# Create app user
sudo adduser --system --group yoforex

# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/yoforex.git
sudo chown -R yoforex:yoforex yoforex

# Switch to app directory
cd yoforex

# Install dependencies
npm ci --production

# Build application
npm run build

# Setup environment
sudo cp .env.production .env
sudo nano .env # Edit with production values
```

#### 3. Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE USER yoforex WITH PASSWORD 'secure-password';
CREATE DATABASE yoforex OWNER yoforex;
GRANT ALL PRIVILEGES ON DATABASE yoforex TO yoforex;
\q

# Run migrations
npm run db:push
npm run db:seed:production
```

#### 4. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'yoforex',
    script: 'npm',
    args: 'run start:production',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/yoforex/error.log',
    out_file: '/var/log/yoforex/out.log',
    log_file: '/var/log/yoforex/combined.log',
    time: true
  }]
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u yoforex --hp /home/yoforex
```

#### 5. Nginx Configuration

```nginx
# /etc/nginx/sites-available/yoforex
upstream yoforex_backend {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
    keepalive 64;
}

server {
    listen 80;
    server_name yoforex.net www.yoforex.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yoforex.net www.yoforex.net;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yoforex.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yoforex.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Max upload size
    client_max_body_size 10M;
    
    # Proxy settings
    location / {
        proxy_pass http://yoforex_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 90;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://yoforex_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Static files
    location /_next/static {
        alias /var/www/yoforex/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    location /public {
        alias /var/www/yoforex/public;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/yoforex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Docker Deployment

#### 1. Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Install production dependencies only
RUN npm ci --production && \
    npm cache clean --force

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:production"]
```

#### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://yoforex:password@postgres:5432/yoforex
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: yoforex
      POSTGRES_PASSWORD: secure-password
      POSTGRES_DB: yoforex
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d --build

# Scale application
docker-compose up -d --scale app=3

# View logs
docker-compose logs -f app

# Update application
docker-compose pull
docker-compose up -d --no-deps app
```

### Kubernetes Deployment

#### 1. Kubernetes Manifests

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yoforex-app
  labels:
    app: yoforex
spec:
  replicas: 3
  selector:
    matchLabels:
      app: yoforex
  template:
    metadata:
      labels:
        app: yoforex
    spec:
      containers:
      - name: yoforex
        image: yoforex/app:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: yoforex-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: yoforex-service
spec:
  selector:
    app: yoforex
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: yoforex-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: yoforex-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace yoforex

# Create secrets
kubectl create secret generic yoforex-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=session-secret=$SESSION_SECRET \
  -n yoforex

# Deploy application
kubectl apply -f deployment.yaml -n yoforex

# Check status
kubectl get pods -n yoforex
kubectl get svc -n yoforex

# Scale manually
kubectl scale deployment yoforex-app --replicas=5 -n yoforex

# Update image
kubectl set image deployment/yoforex-app yoforex=yoforex/app:v2.0.0 -n yoforex

# Roll out status
kubectl rollout status deployment/yoforex-app -n yoforex
```

## Database Migration

### Production Migration Strategy

```bash
# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
DATABASE_URL=$STAGING_DB npm run db:migrate

# 3. Run migration with zero downtime
npm run db:migrate:safe

# 4. Verify migration
psql $DATABASE_URL -c "\dt"
```

### Migration Script

```typescript
// scripts/migrate-production.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';

async function runMigration() {
  console.log('Starting migration...');
  
  try {
    // Create backup point
    await db.execute('SAVEPOINT before_migration');
    
    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });
    
    // Verify critical tables
    const tables = await db.execute(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const requiredTables = ['users', 'forum_threads', 'content'];
    const missingTables = requiredTables.filter(
      t => !tables.rows.find(r => r.tablename === t)
    );
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    await db.execute('ROLLBACK TO SAVEPOINT before_migration');
    process.exit(1);
  }
}

runMigration();
```

## SSL Configuration

### Let's Encrypt Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yoforex.net -d www.yoforex.net

# Test renewal
sudo certbot renew --dry-run

# Auto-renewal (crontab)
0 0,12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL

```bash
# Origin certificate (15 years)
# Generate in Cloudflare dashboard

# Save certificates
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/cert.pem
sudo nano /etc/ssl/cloudflare/key.pem

# Update nginx
ssl_certificate /etc/ssl/cloudflare/cert.pem;
ssl_certificate_key /etc/ssl/cloudflare/key.pem;
```

## CDN Setup

### Cloudflare Configuration

```javascript
// Cloudflare Page Rules
1. Cache Level: Cache Everything
   URL: yoforex.net/_next/static/*
   
2. Browser Cache TTL: 1 year
   URL: yoforex.net/public/*
   
3. Security Level: High
   URL: yoforex.net/admin/*

// Cloudflare Workers (Edge Functions)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Add security headers
  const response = await fetch(request);
  const headers = new Headers(response.headers);
  
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

## Monitoring Setup

### Application Monitoring

```typescript
// monitoring/setup.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Sentry setup
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});

// Custom metrics
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  // Send to monitoring service
  fetch('https://metrics.yoforex.net/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name, value, tags, timestamp: Date.now() })
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    responseTime: process.hrtime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: 'OK',
      redis: 'OK',
      storage: 'OK'
    }
  };
  
  res.status(200).json(health);
});
```

### Infrastructure Monitoring

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'yoforex'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
  
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
```

## Backup Procedures

### Automated Backups

```bash
#!/bin/bash
# backup.sh

# Configuration
BACKUP_DIR="/backups"
DB_URL="postgresql://user:pass@localhost/yoforex"
S3_BUCKET="yoforex-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR/$(date +%Y%m%d)

# Database backup
pg_dump $DB_URL | gzip > $BACKUP_DIR/$(date +%Y%m%d)/db_$(date +%H%M%S).sql.gz

# Application files backup
tar -czf $BACKUP_DIR/$(date +%Y%m%d)/app_$(date +%H%M%S).tar.gz \
  /var/www/yoforex \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git

# Upload to S3
aws s3 sync $BACKUP_DIR/$(date +%Y%m%d) s3://$S3_BUCKET/$(date +%Y%m%d)/

# Clean old backups
find $BACKUP_DIR -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
aws s3 rm s3://$S3_BUCKET/ --recursive --exclude "*" --include "*/$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)/*"

# Verify backup
if [ $? -eq 0 ]; then
  echo "Backup successful: $(date)"
else
  echo "Backup failed: $(date)" | mail -s "YoForex Backup Failed" admin@yoforex.net
fi
```

### Backup Schedule

```cron
# Crontab entries
# Database backup every 6 hours
0 */6 * * * /scripts/backup-db.sh

# Full backup daily at 2 AM
0 2 * * * /scripts/backup-full.sh

# Incremental backup every hour
0 * * * * /scripts/backup-incremental.sh

# Weekly verification
0 3 * * 0 /scripts/verify-backups.sh
```

## Scaling Considerations

### Horizontal Scaling

```typescript
// cluster.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numWorkers = process.env.CLUSTER_WORKERS || os.cpus().length;
  
  console.log(`Master ${process.pid} setting up ${numWorkers} workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting new worker');
    cluster.fork();
  });
} else {
  require('./server');
  console.log(`Worker ${process.pid} started`);
}
```

### Database Scaling

```sql
-- Read replica setup
CREATE PUBLICATION yoforex_publication FOR ALL TABLES;

-- On replica
CREATE SUBSCRIPTION yoforex_subscription
  CONNECTION 'host=primary-host dbname=yoforex'
  PUBLICATION yoforex_publication;
```

### Caching Strategy

```typescript
// Redis caching
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Cache middleware
export function cacheMiddleware(ttl = 3600) {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, ttl, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
}
```

## Rollback Strategy

### Blue-Green Deployment

```bash
# Deploy to green environment
./deploy.sh green

# Test green environment
./test-environment.sh green

# Switch traffic to green
./switch-traffic.sh green

# If issues, rollback to blue
./switch-traffic.sh blue
```

### Database Rollback

```bash
# Create restore point
pg_dump $DATABASE_URL > restore_point.sql

# Apply changes
npm run db:migrate

# If rollback needed
psql $DATABASE_URL < restore_point.sql
```

### Application Rollback

```bash
# PM2 rollback
pm2 reload ecosystem.config.js --update-env
pm2 reset yoforex

# Docker rollback
docker-compose up -d --no-deps app:previous

# Kubernetes rollback
kubectl rollout undo deployment/yoforex-app
kubectl rollout status deployment/yoforex-app
```

## Post-Deployment

### Verification Checklist

```bash
# 1. Check application health
curl https://yoforex.net/health

# 2. Test critical paths
npm run test:smoke

# 3. Monitor logs
pm2 logs --lines 100
tail -f /var/log/nginx/error.log

# 4. Check metrics
curl https://yoforex.net/metrics

# 5. Verify SSL
openssl s_client -connect yoforex.net:443

# 6. Test WebSocket
wscat -c wss://yoforex.net

# 7. Check SEO
curl -I https://yoforex.net
```

### Performance Testing

```bash
# Load test
k6 run tests/performance/load-test.js

# Lighthouse audit
lighthouse https://yoforex.net --output html --view

# GTmetrix test
curl -X POST "https://gtmetrix.com/api/2.0/tests" \
  -u "api-key:" \
  -d "url=https://yoforex.net"
```

### Monitoring Alerts

```javascript
// Alert configuration
const alerts = {
  uptime: {
    threshold: 99.9,
    window: '5m',
    action: 'email,slack'
  },
  responseTime: {
    threshold: 1000, // ms
    window: '1m',
    action: 'slack'
  },
  errorRate: {
    threshold: 1, // percent
    window: '5m',
    action: 'pagerduty'
  },
  diskSpace: {
    threshold: 90, // percent
    action: 'email'
  }
};
```

## Summary

Successful deployment requires:

1. **Preparation**: Test thoroughly, prepare rollback plan
2. **Configuration**: Secure environment variables, optimize settings
3. **Deployment**: Use appropriate method for scale
4. **Monitoring**: Set up comprehensive monitoring
5. **Maintenance**: Regular backups, updates, and optimization

Remember: Always deploy to staging first, monitor closely after deployment, and have a rollback plan ready.