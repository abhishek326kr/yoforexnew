# Database Schema Documentation

## Table of Contents
- [Overview](#overview)
- [Database Design Principles](#database-design-principles)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Core Tables](#core-tables)
  - [User Management](#user-management)
  - [Forum System](#forum-system)
  - [Marketplace](#marketplace)
  - [Sweets Economy](#sweets-economy)
  - [Messaging System](#messaging-system)
  - [Admin System](#admin-system)
- [Indexes](#indexes)
- [Constraints](#constraints)
- [Triggers](#triggers)
- [Migration Strategy](#migration-strategy)
- [Backup & Recovery](#backup--recovery)
- [Performance Optimization](#performance-optimization)
- [Query Examples](#query-examples)

## Overview

YoForex uses PostgreSQL 13+ as its primary database, hosted on Neon (serverless PostgreSQL). The database schema is managed using Drizzle ORM with TypeScript for type safety.

### Database Statistics
- **Total Tables**: 85+
- **Total Indexes**: 120+
- **Database Size**: ~50GB (production)
- **Daily Transactions**: 1M+
- **Average Query Time**: < 50ms

## Database Design Principles

### 1. Normalization
- 3NF (Third Normal Form) for transactional data
- Controlled denormalization for performance-critical queries
- JSON/JSONB for flexible metadata storage

### 2. Data Integrity
- Foreign key constraints
- Check constraints for business rules
- NOT NULL constraints where appropriate
- Unique constraints for natural keys

### 3. Performance
- Strategic indexing
- Partitioning for large tables
- Query optimization
- Connection pooling

### 4. Security
- Row-level security (RLS) where applicable
- Encrypted sensitive data
- Audit logging
- Least privilege access

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER DOMAIN                             │
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────────┐           │
│  │  users   │────▷│ profiles │────▷│ user_settings│           │
│  └──────────┘     └──────────┘     └──────────────┘           │
│       │                │                                        │
│       │                ├────▷ user_badges                       │
│       │                ├────▷ user_follows                     │
│       │                └────▷ user_activity                    │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐      │
│  │user_wallet│────▷│coin_transactions│──▷│coin_journal  │      │
│  └──────────┘     └──────────────┘     └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FORUM DOMAIN                             │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────┐      │
│  │forum_categories│◁──│forum_threads │────▷│forum_replies│     │
│  └──────────────┘     └──────────────┘     └──────────┘      │
│                            │                     │              │
│                            ├────▷ forum_thread_likes            │
│                            └────▷ forum_thread_views            │
│                                                 │               │
│                                    forum_reply_likes            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MARKETPLACE DOMAIN                          │
│                                                                  │
│  ┌──────────┐     ┌──────────────────┐     ┌──────────────┐  │
│  │ content  │────▷│ content_purchases │     │content_reviews│  │
│  └──────────┘     └──────────────────┘     └──────────────┘  │
│       │                                            │            │
│       ├────▷ content_likes                        │            │
│       ├────▷ content_replies                      │            │
│       └────▷ file_assets                          ▼            │
│                                           content_ratings       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MESSAGING DOMAIN                           │
│                                                                  │
│  ┌──────────────┐     ┌──────────┐     ┌──────────────────┐  │
│  │conversations │────▷│ messages  │────▷│message_attachments│  │
│  └──────────────┘     └──────────┘     └──────────────────┘  │
│         │                    │                                  │
│         │                    ├────▷ message_reactions           │
│         │                    └────▷ message_read_receipts      │
│         │                                                       │
│         └────▷ conversation_participants                        │
└─────────────────────────────────────────────────────────────────┘

Legend: ────▷ One-to-Many    ◁──▷ Many-to-Many    ═══▷ One-to-One
```

## Core Tables

### User Management

#### users
Primary user account table.

```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email VARCHAR UNIQUE,
    password_hash VARCHAR,
    auth_provider VARCHAR(20) DEFAULT 'email',
    is_email_verified BOOLEAN DEFAULT false,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### profiles
Extended user profile information.

```sql
CREATE TABLE profiles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
    bio TEXT,
    avatar_url VARCHAR,
    location VARCHAR(100),
    website VARCHAR(255),
    social_links JSONB,
    trading_experience VARCHAR(50),
    favorite_pairs TEXT[],
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

#### user_wallet
User's coin balance and wallet information.

```sql
CREATE TABLE user_wallet (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    locked_balance INTEGER DEFAULT 0 CHECK (locked_balance >= 0),
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    loyalty_tier VARCHAR(20) DEFAULT 'bronze',
    withdrawal_fee DECIMAL(3,2) DEFAULT 0.07,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_wallet_user_id ON user_wallet(user_id);
CREATE INDEX idx_wallet_loyalty_tier ON user_wallet(loyalty_tier);
```

### Forum System

#### forum_categories
Hierarchical forum categories.

```sql
CREATE TABLE forum_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id VARCHAR REFERENCES forum_categories(id),
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    thread_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    last_post_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_categories_parent ON forum_categories(parent_id);
CREATE INDEX idx_categories_slug ON forum_categories(slug);
CREATE INDEX idx_categories_order ON forum_categories(display_order);
```

#### forum_threads
Discussion threads.

```sql
CREATE TABLE forum_threads (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) NOT NULL,
    content TEXT NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    category_id VARCHAR NOT NULL REFERENCES forum_categories(id),
    tags TEXT[],
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    best_reply_id VARCHAR,
    last_reply_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_threads_user ON forum_threads(user_id);
CREATE INDEX idx_threads_category ON forum_threads(category_id);
CREATE INDEX idx_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_threads_slug ON forum_threads(slug);
CREATE INDEX idx_threads_featured ON forum_threads(is_featured, created_at DESC);
```

#### forum_replies
Thread replies.

```sql
CREATE TABLE forum_replies (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR NOT NULL REFERENCES forum_threads(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    reply_to_id VARCHAR REFERENCES forum_replies(id),
    like_count INTEGER DEFAULT 0,
    is_best_answer BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_replies_thread ON forum_replies(thread_id);
CREATE INDEX idx_replies_user ON forum_replies(user_id);
CREATE INDEX idx_replies_created ON forum_replies(created_at);
CREATE INDEX idx_replies_best ON forum_replies(thread_id, is_best_answer);
```

### Marketplace

#### content (marketplace items)
Digital products in the marketplace.

```sql
CREATE TABLE content (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    long_description TEXT,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    discount_price INTEGER,
    features JSONB,
    requirements JSONB,
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1),
    review_count INTEGER DEFAULT 0,
    version VARCHAR(20),
    file_size INTEGER,
    preview_images TEXT[],
    is_featured BOOLEAN DEFAULT false,
    approved_at TIMESTAMP,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_content_user ON content(user_id);
CREATE INDEX idx_content_category ON content(category);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_featured ON content(is_featured, created_at DESC);
CREATE INDEX idx_content_price ON content(price);
```

#### content_purchases
Purchase records for marketplace items.

```sql
CREATE TABLE content_purchases (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL REFERENCES content(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    price INTEGER NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'coins',
    download_count INTEGER DEFAULT 0,
    last_download_at TIMESTAMP,
    license_key VARCHAR(100),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_purchases_unique ON content_purchases(content_id, user_id);
CREATE INDEX idx_purchases_user ON content_purchases(user_id);
CREATE INDEX idx_purchases_content ON content_purchases(content_id);
```

### Sweets Economy

#### coin_transactions
All coin transactions.

```sql
CREATE TABLE coin_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    trigger VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    reference_id VARCHAR,
    reference_type VARCHAR(50),
    balance_before INTEGER,
    balance_after INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_user ON coin_transactions(user_id);
CREATE INDEX idx_transactions_created ON coin_transactions(created_at DESC);
CREATE INDEX idx_transactions_trigger ON coin_transactions(trigger);
CREATE INDEX idx_transactions_channel ON coin_transactions(channel);
CREATE INDEX idx_transactions_reference ON coin_transactions(reference_type, reference_id);
```

#### withdrawal_requests
Coin withdrawal requests.

```sql
CREATE TABLE withdrawal_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    fee INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    method VARCHAR(20) NOT NULL,
    details JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    processed_by VARCHAR REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_withdrawals_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawals_created ON withdrawal_requests(created_at DESC);
```

#### vault_coins
Locked coins in growth vault.

```sql
CREATE TABLE vault_coins (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    unlock_date DATE NOT NULL,
    source_transaction_id VARCHAR REFERENCES coin_transactions(id),
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_vault_user ON vault_coins(user_id);
CREATE INDEX idx_vault_unlock ON vault_coins(unlock_date, is_unlocked);
```

### Messaging System

#### conversations
Message conversations.

```sql
CREATE TABLE conversations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100),
    type VARCHAR(20) DEFAULT 'direct',
    creator_id VARCHAR NOT NULL REFERENCES users(id),
    is_group BOOLEAN DEFAULT false,
    last_message_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conversations_creator ON conversations(creator_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

#### messages
Individual messages.

```sql
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
    sender_id VARCHAR NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    reply_to_id VARCHAR REFERENCES messages(id),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at DESC);
```

#### conversation_participants
Participants in conversations.

```sql
CREATE TABLE conversation_participants (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    last_read_at TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    is_muted BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_participants_unique ON conversation_participants(conversation_id, user_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
```

### Admin System

#### admin_actions
Admin activity log.

```sql
CREATE TABLE admin_actions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_action ON admin_actions(action);
```

#### moderation_queue
Content awaiting moderation.

```sql
CREATE TABLE moderation_queue (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL,
    content_id VARCHAR NOT NULL,
    reason VARCHAR(100),
    reporter_id VARCHAR REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to VARCHAR REFERENCES users(id),
    resolution VARCHAR(20),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_moderation_status ON moderation_queue(status);
CREATE INDEX idx_moderation_priority ON moderation_queue(priority, created_at);
CREATE INDEX idx_moderation_assigned ON moderation_queue(assigned_to);
```

## Indexes

### Performance-Critical Indexes

```sql
-- User queries
CREATE INDEX idx_users_email_verified ON users(email, is_email_verified);
CREATE INDEX idx_users_role_status ON users(role, status);

-- Forum queries
CREATE INDEX idx_threads_category_pinned ON forum_threads(category_id, is_pinned DESC, created_at DESC);
CREATE INDEX idx_threads_user_created ON forum_threads(user_id, created_at DESC);
CREATE INDEX idx_replies_thread_best ON forum_replies(thread_id, is_best_answer, created_at);

-- Marketplace queries
CREATE INDEX idx_content_category_featured ON content(category, is_featured DESC, created_at DESC);
CREATE INDEX idx_content_user_status ON content(user_id, status);
CREATE INDEX idx_purchases_user_created ON content_purchases(user_id, created_at DESC);

-- Transaction queries
CREATE INDEX idx_transactions_user_type ON coin_transactions(user_id, type, created_at DESC);
CREATE INDEX idx_transactions_daily ON coin_transactions(date_trunc('day', created_at), user_id);

-- Message queries
CREATE INDEX idx_messages_conversation_unread ON messages(conversation_id, created_at) WHERE is_deleted = false;
CREATE INDEX idx_participants_user_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;
```

### Full-Text Search Indexes

```sql
-- Forum search
CREATE INDEX idx_threads_search ON forum_threads USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_replies_search ON forum_replies USING gin(to_tsvector('english', content));

-- Marketplace search
CREATE INDEX idx_content_search ON content USING gin(to_tsvector('english', title || ' ' || description));

-- User search
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', username || ' ' || COALESCE(email, '')));
```

## Constraints

### Foreign Key Constraints

```sql
-- Cascading deletes
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_replies ADD CONSTRAINT fk_replies_thread 
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE;

ALTER TABLE messages ADD CONSTRAINT fk_messages_conversation 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Restrict deletes
ALTER TABLE coin_transactions ADD CONSTRAINT fk_transactions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE content_purchases ADD CONSTRAINT fk_purchases_content 
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE RESTRICT;
```

### Check Constraints

```sql
-- Business rule constraints
ALTER TABLE user_wallet ADD CONSTRAINT chk_wallet_balance 
    CHECK (balance >= locked_balance);

ALTER TABLE content ADD CONSTRAINT chk_content_price 
    CHECK (discount_price IS NULL OR discount_price < price);

ALTER TABLE coin_transactions ADD CONSTRAINT chk_transaction_amount 
    CHECK ((type = 'credit' AND amount > 0) OR (type = 'debit' AND amount < 0));

ALTER TABLE withdrawal_requests ADD CONSTRAINT chk_withdrawal_amount 
    CHECK (net_amount = amount - fee AND fee >= 0);
```

### Unique Constraints

```sql
-- Natural keys
ALTER TABLE forum_categories ADD CONSTRAINT uk_category_slug UNIQUE (slug);
ALTER TABLE content ADD CONSTRAINT uk_content_slug UNIQUE (slug);
ALTER TABLE users ADD CONSTRAINT uk_user_email UNIQUE (email);

-- Composite unique constraints
ALTER TABLE user_follows ADD CONSTRAINT uk_follow UNIQUE (follower_id, following_id);
ALTER TABLE forum_thread_likes ADD CONSTRAINT uk_thread_like UNIQUE (thread_id, user_id);
ALTER TABLE content_purchases ADD CONSTRAINT uk_purchase UNIQUE (content_id, user_id);
```

## Triggers

### Automatic Timestamp Updates

```sql
-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_timestamp 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_timestamp 
    BEFORE UPDATE ON content 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Counter Updates

```sql
-- Update thread reply count
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_threads 
        SET reply_count = reply_count + 1,
            last_reply_at = NEW.created_at
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_threads 
        SET reply_count = reply_count - 1
        WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_count
    AFTER INSERT OR DELETE ON forum_replies
    FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();
```

### Audit Logging

```sql
-- Audit log trigger
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        operation,
        user_id,
        row_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        current_setting('app.current_user', true),
        COALESCE(NEW.id, OLD.id),
        row_to_json(OLD),
        row_to_json(NEW),
        CURRENT_TIMESTAMP
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER audit_users 
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Migration Strategy

### Drizzle Migration Commands

```bash
# Generate migration
npm run drizzle-kit generate:pg

# Push schema to database
npm run db:push

# Run migrations
npm run drizzle-kit migrate

# Drop migration
npm run drizzle-kit drop
```

### Migration Best Practices

1. **Always backup before migration**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations in staging**
   ```bash
   DATABASE_URL=$STAGING_DB npm run db:push
   ```

3. **Use transactions for DDL**
   ```sql
   BEGIN;
   -- Migration statements
   COMMIT;
   ```

4. **Handle zero-downtime migrations**
   ```sql
   -- Add column (safe)
   ALTER TABLE users ADD COLUMN new_field VARCHAR;
   
   -- Drop column (needs application update first)
   -- Step 1: Deploy app that doesn't use column
   -- Step 2: Drop column
   ALTER TABLE users DROP COLUMN old_field;
   ```

## Backup & Recovery

### Backup Strategy

```bash
# Daily full backup
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/daily/db_$(date +\%Y\%m\%d).sql.gz

# Hourly incremental backup (WAL archiving)
0 * * * * pg_basebackup -D /backups/incremental -Ft -z -P

# Weekly backup to S3
0 3 * * 0 pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://backups/weekly/db_$(date +\%Y\%m\%d).sql.gz
```

### Recovery Procedures

```bash
# Restore from backup
gunzip < backup.sql.gz | psql $DATABASE_URL

# Point-in-time recovery
pg_restore -d $DATABASE_URL -t "2025-01-06 10:00:00" backup.tar

# Restore specific table
pg_restore -d $DATABASE_URL -t users backup.tar
```

### Disaster Recovery Plan

1. **RPO (Recovery Point Objective)**: 1 hour
2. **RTO (Recovery Time Objective)**: 4 hours
3. **Backup retention**: 30 days daily, 12 months monthly
4. **Geographic redundancy**: Backups in 2+ regions

## Performance Optimization

### Query Optimization Tips

```sql
-- Use EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM forum_threads 
WHERE category_id = '123' 
ORDER BY created_at DESC 
LIMIT 20;

-- Optimize JOIN queries
-- Good: Join on indexed columns
SELECT t.*, u.username, u.avatar_url
FROM forum_threads t
INNER JOIN users u ON t.user_id = u.id
WHERE t.category_id = '123';

-- Avoid N+1 queries
-- Bad: Multiple queries
SELECT * FROM forum_threads WHERE category_id = '123';
-- Then for each thread:
SELECT * FROM forum_replies WHERE thread_id = ?;

-- Good: Single query with JOIN
SELECT t.*, r.*
FROM forum_threads t
LEFT JOIN forum_replies r ON t.id = r.thread_id
WHERE t.category_id = '123';
```

### Database Tuning

```sql
-- PostgreSQL configuration (postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB
max_connections = 100
random_page_cost = 1.1

-- Connection pooling (application level)
{
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

### Monitoring Queries

```sql
-- Slow query log
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Table statistics
SELECT schemaname, tablename, 
       n_live_tup, n_dead_tup, 
       last_vacuum, last_analyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Index usage
SELECT schemaname, tablename, indexname, 
       idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Query Examples

### Common Queries

```sql
-- Get user with wallet and profile
SELECT u.*, p.*, w.*
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN user_wallet w ON u.id = w.user_id
WHERE u.id = $1;

-- Get trending threads
SELECT t.*, u.username, u.avatar_url, c.name as category_name
FROM forum_threads t
JOIN users u ON t.user_id = u.id
JOIN forum_categories c ON t.category_id = c.id
WHERE t.created_at > NOW() - INTERVAL '7 days'
ORDER BY (t.view_count * 0.3 + t.reply_count * 0.5 + t.like_count * 0.2) DESC
LIMIT 10;

-- Get user's coin transaction history
SELECT ct.*, 
       CASE 
         WHEN ct.type = 'credit' THEN ct.balance_after - ct.amount
         ELSE ct.balance_after + ABS(ct.amount)
       END as balance_before
FROM coin_transactions ct
WHERE ct.user_id = $1
ORDER BY ct.created_at DESC
LIMIT 50;

-- Get marketplace bestsellers
SELECT c.*, u.username as seller_name,
       COUNT(DISTINCT cp.user_id) as unique_buyers,
       SUM(cp.price) as total_revenue
FROM content c
JOIN content_purchases cp ON c.id = cp.content_id
JOIN users u ON c.user_id = u.id
WHERE cp.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.id, u.username
ORDER BY COUNT(cp.id) DESC
LIMIT 10;

-- Get unread messages count
SELECT cp.conversation_id, COUNT(m.id) as unread_count
FROM conversation_participants cp
JOIN messages m ON m.conversation_id = cp.conversation_id
WHERE cp.user_id = $1
  AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
  AND m.sender_id != $1
GROUP BY cp.conversation_id;
```

### Analytics Queries

```sql
-- Daily active users
SELECT DATE(created_at) as day, 
       COUNT(DISTINCT user_id) as dau
FROM user_activity
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Revenue by category
SELECT c.category,
       COUNT(DISTINCT cp.id) as purchases,
       SUM(cp.price) as revenue,
       AVG(cp.price) as avg_price
FROM content c
JOIN content_purchases cp ON c.id = cp.content_id
WHERE cp.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.category
ORDER BY revenue DESC;

-- User retention cohort
WITH cohorts AS (
  SELECT DATE_TRUNC('week', u.created_at) as cohort_week,
         u.id as user_id
  FROM users u
  WHERE u.created_at > NOW() - INTERVAL '12 weeks'
),
activities AS (
  SELECT c.cohort_week,
         c.user_id,
         DATE_TRUNC('week', ua.created_at) as activity_week
  FROM cohorts c
  JOIN user_activity ua ON c.user_id = ua.user_id
)
SELECT cohort_week,
       COUNT(DISTINCT CASE WHEN activity_week = cohort_week THEN user_id END) as week_0,
       COUNT(DISTINCT CASE WHEN activity_week = cohort_week + INTERVAL '1 week' THEN user_id END) as week_1,
       COUNT(DISTINCT CASE WHEN activity_week = cohort_week + INTERVAL '2 weeks' THEN user_id END) as week_2
FROM activities
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

## Database Maintenance

### Regular Maintenance Tasks

```sql
-- Vacuum and analyze (daily)
VACUUM ANALYZE;

-- Reindex (weekly)
REINDEX DATABASE yoforex;

-- Update statistics (after bulk operations)
ANALYZE forum_threads;
ANALYZE coin_transactions;

-- Clean up old sessions (daily)
DELETE FROM sessions WHERE expire < NOW();

-- Archive old data (monthly)
INSERT INTO coin_transactions_archive 
SELECT * FROM coin_transactions 
WHERE created_at < NOW() - INTERVAL '6 months';

DELETE FROM coin_transactions 
WHERE created_at < NOW() - INTERVAL '6 months';
```

### Health Checks

```sql
-- Database size
SELECT pg_database_size('yoforex') / 1024 / 1024 as size_mb;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection count
SELECT COUNT(*) as connections,
       state
FROM pg_stat_activity
GROUP BY state;

-- Long-running queries
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE query != '<IDLE>'
  AND query NOT ILIKE '%pg_stat_activity%'
  AND age(clock_timestamp(), query_start) > '5 minutes'
ORDER BY query_start;
```

## Security Considerations

### Data Protection

```sql
-- Encrypt sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt email
UPDATE users SET email = pgp_sym_encrypt(email, 'encryption_key');

-- Row-level security
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_owner ON coin_transactions
    FOR ALL
    TO application_user
    USING (user_id = current_setting('app.current_user')::VARCHAR);
```

### Access Control

```sql
-- Create roles
CREATE ROLE readonly;
CREATE ROLE readwrite;
CREATE ROLE admin;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;

-- Create users
CREATE USER api_user WITH PASSWORD 'secure_password';
GRANT readwrite TO api_user;

CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT readonly TO analytics_user;
```

## Conclusion

The YoForex database schema is designed for:
- **Scalability**: Handles millions of records efficiently
- **Performance**: Optimized indexes and queries
- **Integrity**: Comprehensive constraints and triggers
- **Security**: Encryption and access control
- **Maintainability**: Clear structure and documentation

Regular monitoring, optimization, and maintenance ensure optimal performance and reliability.