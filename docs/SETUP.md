# Setup Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Quick Setup](#quick-setup)
- [Detailed Setup](#detailed-setup)
  - [1. Repository Setup](#1-repository-setup)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Database Setup](#3-database-setup)
  - [4. Firebase Setup](#4-firebase-setup)
  - [5. Email Service Setup](#5-email-service-setup)
  - [6. Object Storage Setup](#6-object-storage-setup)
- [Running the Application](#running-the-application)
- [Seeding Data](#seeding-data)
- [Verification Steps](#verification-steps)
- [Common Issues](#common-issues)
- [IDE Setup](#ide-setup)
- [Docker Setup (Optional)](#docker-setup-optional)

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.0.0 | 20.0.0+ |
| npm | 9.0.0 | 10.0.0+ |
| PostgreSQL | 13.0 | 15.0+ |
| RAM | 4GB | 8GB+ |
| Disk Space | 2GB | 5GB+ |

### Required Accounts

- **PostgreSQL Database**: Local installation or [Neon](https://neon.tech) account
- **Firebase**: [Firebase Console](https://console.firebase.google.com) project
- **SMTP Service**: Email provider (Hostinger, SendGrid, etc.)
- **Google Cloud** (Optional): For advanced features

## Development Environment Setup

### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install Git
brew install git
```

### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Git
sudo apt install -y git

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs

# Install PostgreSQL
choco install postgresql

# Install Git
choco install git
```

## Quick Setup

For experienced developers, here's the quick setup:

```bash
# Clone repository
git clone https://github.com/yourusername/yoforex.git
cd yoforex

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Setup database
npm run db:push

# Seed initial data
npm run db:seed

# Start development server
npm run dev

# Access at http://localhost:5000
```

## Detailed Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/yoforex.git

# Navigate to project directory
cd yoforex

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ============================================
# Database Configuration
# ============================================
DATABASE_URL=postgresql://username:password@localhost:5432/yoforex
# For Neon: postgresql://username:password@host.neon.tech/dbname?sslmode=require

# ============================================
# Application Configuration
# ============================================
NODE_ENV=development
PORT=5000
API_PORT=5001

# Session Configuration
SESSION_SECRET=your-very-long-random-string-here-at-least-32-chars
SESSION_NAME=yoforex.sid
SESSION_MAX_AGE=2592000000  # 30 days in milliseconds

# ============================================
# Authentication (Firebase)
# ============================================
# Client-side Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Server-side Firebase Admin
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"..."}'
# Or use a file path
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-admin-key.json

# ============================================
# Email Service (SMTP)
# ============================================
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yoforex.net
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yoforex.net
SMTP_FROM_NAME=YoForex

# ============================================
# URLs and Domains
# ============================================
NEXT_PUBLIC_BASE_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# Production URLs (uncomment for production)
# NEXT_PUBLIC_BASE_URL=https://yoforex.net
# NEXT_PUBLIC_API_URL=https://yoforex.net/api
# NEXT_PUBLIC_WS_URL=wss://yoforex.net

# ============================================
# Object Storage (Optional)
# ============================================
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=yoforex-assets

# ============================================
# Analytics (Optional)
# ============================================
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# ============================================
# Feature Flags
# ============================================
ENABLE_BOT_SYSTEM=true
ENABLE_WEBSOCKET=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_OBJECT_STORAGE=false

# ============================================
# Development Settings
# ============================================
DEBUG=false
LOG_LEVEL=info
DISABLE_RATE_LIMITING=true
```

### 3. Database Setup

#### Local PostgreSQL Setup

```bash
# Create database user
psql -U postgres
CREATE USER yoforex WITH PASSWORD 'your-password';
CREATE DATABASE yoforex OWNER yoforex;
GRANT ALL PRIVILEGES ON DATABASE yoforex TO yoforex;
\q

# Test connection
psql postgresql://yoforex:your-password@localhost:5432/yoforex
\dt  # List tables (should be empty initially)
\q
```

#### Neon Database Setup

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Update DATABASE_URL in `.env`

```env
DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
```

#### Initialize Database Schema

```bash
# Push schema to database
npm run db:push

# Verify tables were created
psql $DATABASE_URL -c "\dt"
```

### 4. Firebase Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Name it "yoforex" (or your preferred name)
4. Enable Google Analytics (optional)

#### Enable Authentication

1. In Firebase Console, go to Authentication
2. Click "Get Started"
3. Enable providers:
   - Email/Password
   - Google (optional)

#### Get Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps" → Add app → Web
3. Register app with nickname "YoForex Web"
4. Copy the configuration:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

5. Add these values to your `.env` file

#### Get Admin SDK Key

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file
4. Either:
   - Copy contents to FIREBASE_SERVICE_ACCOUNT in `.env`
   - Save as `firebase-admin-key.json` and set path in `.env`

### 5. Email Service Setup

#### Hostinger SMTP

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-email-password
```

#### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Gmail (Development Only)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

**Note**: For Gmail, enable 2FA and create an app-specific password.

#### Test Email Configuration

```bash
# Run email test script
npm run test:email

# Or use the built-in test endpoint
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

### 6. Object Storage Setup (Optional)

#### AWS S3

```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=yoforex-assets
```

#### Cloudflare R2

```env
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key
S3_BUCKET_NAME=yoforex-assets
```

#### Local Storage (Development)

```env
ENABLE_OBJECT_STORAGE=false
# Files will be stored in ./uploads directory
```

## Running the Application

### Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run dev:next    # Frontend only (port 3000)
npm run dev:api     # Backend only (port 5001)

# Access at:
# - Full app: http://localhost:5000
# - API: http://localhost:5000/api
# - Admin: http://localhost:5000/admin
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start

# Or with PM2
npm run pm2:start
```

### Docker Mode (Optional)

```bash
# Build Docker image
docker-compose build

# Start containers
docker-compose up

# Stop containers
docker-compose down
```

## Seeding Data

### Basic Seed (Required)

```bash
# Seed essential data
npm run db:seed

# This creates:
# - Admin user (Admin@yoforex.net / Arijit@101)
# - Forum categories
# - Rank tiers
# - Initial bot accounts
```

### Demo Data (Optional)

```bash
# Seed demo content
npm run seed:demo

# This creates:
# - Sample users
# - Forum threads and replies
# - Marketplace items
# - Messages
# - Transactions
```

### Custom Seeds

```bash
# Seed specific data
npm run seed:categories    # Forum categories only
npm run seed:marketplace   # Marketplace items
npm run seed:users         # Test users
npm run seed:bots          # Bot accounts
```

## Verification Steps

### 1. Database Connection

```bash
# Test database connection
npm run db:test

# Or manually
psql $DATABASE_URL -c "SELECT current_database();"
```

### 2. Server Health Check

```bash
# Check API health
curl http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "email": "configured",
  "firebase": "connected"
}
```

### 3. Authentication Test

```bash
# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "username": "testuser"
  }'
```

### 4. Admin Access

1. Navigate to http://localhost:5000/admin
2. Login with:
   - Email: Admin@yoforex.net
   - Password: Arijit@101

### 5. WebSocket Test

Open browser console and run:

```javascript
const socket = io('ws://localhost:5000');
socket.on('connect', () => console.log('WebSocket connected'));
```

## Common Issues

### Database Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/*.log
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
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

### Firebase Authentication Error

**Error**: `Firebase: Error (auth/invalid-api-key)`

**Solution**:
1. Verify Firebase configuration in `.env`
2. Check if Firebase project is active
3. Regenerate API keys if needed

### Email Not Sending

**Error**: `Error: Invalid login: 535 Authentication failed`

**Solution**:
```bash
# Test SMTP credentials
npm run test:email

# Check SMTP settings
- Verify username/password
- Check port (465 for SSL, 587 for TLS)
- Ensure SMTP_SECURE matches port
- Check if IP is whitelisted
```

### Module Not Found

**Error**: `Cannot find module 'X'`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be >= 18.0.0
```

## IDE Setup

### VS Code

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.npm-intellisense",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### WebStorm/IntelliJ

1. Enable Node.js plugin
2. Configure TypeScript compiler
3. Set up ESLint
4. Configure database connection
5. Install Tailwind CSS plugin

## Docker Setup (Optional)

### Development with Docker

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: yoforex
      POSTGRES_PASSWORD: password
      POSTGRES_DB: yoforex
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://yoforex:password@postgres:5432/yoforex
      NODE_ENV: development
    depends_on:
      - postgres
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
```

Run with Docker:

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Reset everything
docker-compose down -v
```

### Production Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 5000
CMD ["npm", "start"]
```

## Next Steps

After successful setup:

1. **Read Documentation**
   - [Architecture](./ARCHITECTURE.md)
   - [Development Guide](./DEVELOPMENT.md)
   - [API Reference](./API.md)

2. **Start Development**
   - Create a feature branch
   - Make changes
   - Run tests
   - Submit PR

3. **Join Community**
   - Discord: [discord.gg/yoforex](https://discord.gg/yoforex)
   - Issues: [GitHub Issues](https://github.com/yourusername/yoforex/issues)

## Troubleshooting Resources

- [Common Issues](./TROUBLESHOOTING.md)
- [FAQ](https://yoforex.net/faq)
- [Support](mailto:support@yoforex.net)

## Summary

You should now have a fully functional YoForex development environment. The application should be running at http://localhost:5000 with:

✅ Database connected and seeded  
✅ Authentication working  
✅ Email service configured  
✅ Admin dashboard accessible  
✅ WebSocket server running  
✅ All tests passing

Happy coding! 🚀