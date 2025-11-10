# API Reference

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [User Management](#user-management)
  - [Forum Endpoints](#forum-endpoints)
  - [Marketplace Endpoints](#marketplace-endpoints)
  - [Messaging Endpoints](#messaging-endpoints)
  - [Notification Endpoints](#notification-endpoints)
  - [Sweets Economy](#sweets-economy)
  - [Admin Endpoints](#admin-endpoints)
  - [Bot Endpoints](#bot-endpoints)
- [WebSocket Events](#websocket-events)
- [Error Codes](#error-codes)
- [Examples](#examples)

## Overview

The YoForex API is a RESTful API that provides programmatic access to all platform features. The API uses JSON for request and response bodies, follows REST conventions, and includes comprehensive error handling.

### API Statistics
- **Total Endpoints**: 194
- **Average Response Time**: < 200ms
- **Rate Limit**: 100 requests/minute (standard)
- **Uptime SLA**: 99.9%

## Authentication

The API supports multiple authentication methods:

### Session-Based Authentication

```javascript
// Login request
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response includes session cookie
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; Secure
```

### Bearer Token (Future)

```javascript
// Authorization header
Authorization: Bearer <token>
```

## Base URL

```
Development: http://localhost:5000/api
Production:  https://yoforex.net/api
```

## Request/Response Format

### Standard Request Headers

```http
Content-Type: application/json
Accept: application/json
X-Request-ID: unique-request-id
```

### Standard Response Format

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-01-06T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-06T10:00:00Z",
    "request_id": "req_123456"
  }
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

Rate limits are applied per user/IP:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Standard | 100 req | 1 minute |
| Authentication | 5 req | 1 minute |
| Search | 30 req | 1 minute |
| File Upload | 10 req | 1 hour |

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704537600
```

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe"
    },
    "message": "Registration successful. Please verify your email."
  }
}
```

#### Login
```http
POST /api/auth/login

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "role": "user"
    }
  }
}
```

#### Logout
```http
POST /api/auth/logout

Response: 200 OK
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Verify Email
```http
POST /api/auth/verify-email

Request:
{
  "token": "verification-token"
}

Response: 200 OK
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### Reset Password
```http
POST /api/auth/reset-password

Request:
{
  "email": "user@example.com"
}

Response: 200 OK
{
  "success": true,
  "message": "Password reset email sent"
}
```

### User Management

#### Get Current User
```http
GET /api/user

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "profile": {
      "bio": "Forex trader",
      "avatar": "url",
      "joinedAt": "2025-01-01T00:00:00Z"
    },
    "stats": {
      "posts": 42,
      "reputation": 1234,
      "coins": 5000
    }
  }
}
```

#### Update Profile
```http
PUT /api/user/profile

Request:
{
  "bio": "Professional forex trader",
  "location": "New York",
  "website": "https://example.com",
  "social": {
    "twitter": "@johndoe",
    "telegram": "@johndoe"
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "profile": {
      "bio": "Professional forex trader",
      "location": "New York",
      "website": "https://example.com"
    }
  }
}
```

#### Upload Avatar
```http
POST /api/user/avatar
Content-Type: multipart/form-data

Request: FormData with 'avatar' file

Response: 200 OK
{
  "success": true,
  "data": {
    "avatarUrl": "https://cdn.yoforex.net/avatars/uuid.jpg"
  }
}
```

### Forum Endpoints

#### List Forum Categories
```http
GET /api/forum/categories

Response: 200 OK
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "1",
        "name": "General Discussion",
        "slug": "general-discussion",
        "description": "General forex trading discussion",
        "threadCount": 1234,
        "postCount": 5678,
        "subcategories": []
      }
    ]
  }
}
```

#### Create Thread
```http
POST /api/forum/threads

Request:
{
  "title": "Best EA for scalping?",
  "content": "Looking for recommendations...",
  "categoryId": "1",
  "tags": ["scalping", "ea", "recommendations"]
}

Response: 201 Created
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "title": "Best EA for scalping?",
      "slug": "best-ea-for-scalping",
      "content": "Looking for recommendations...",
      "author": {
        "id": "user-uuid",
        "username": "johndoe"
      },
      "createdAt": "2025-01-06T10:00:00Z"
    }
  }
}
```

#### Get Thread
```http
GET /api/forum/threads/:id

Response: 200 OK
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "title": "Best EA for scalping?",
      "content": "Full content here...",
      "author": {
        "id": "user-uuid",
        "username": "johndoe",
        "avatar": "url"
      },
      "category": {
        "id": "1",
        "name": "General Discussion"
      },
      "stats": {
        "views": 1234,
        "replies": 42,
        "likes": 100
      },
      "replies": [
        {
          "id": "reply-uuid",
          "content": "I recommend...",
          "author": {
            "id": "user-uuid",
            "username": "trader123"
          },
          "createdAt": "2025-01-06T11:00:00Z",
          "likes": 5,
          "isBestAnswer": false
        }
      ]
    }
  }
}
```

#### Create Reply
```http
POST /api/forum/threads/:threadId/replies

Request:
{
  "content": "Here's my recommendation...",
  "replyToId": null
}

Response: 201 Created
{
  "success": true,
  "data": {
    "reply": {
      "id": "reply-uuid",
      "content": "Here's my recommendation...",
      "threadId": "thread-uuid",
      "author": {
        "id": "user-uuid",
        "username": "johndoe"
      },
      "createdAt": "2025-01-06T12:00:00Z"
    }
  }
}
```

#### Like Thread/Reply
```http
POST /api/forum/threads/:id/like

Response: 200 OK
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 101
  }
}
```

### Marketplace Endpoints

#### List Marketplace Items
```http
GET /api/marketplace/items?category=ea&sort=popular&page=1&limit=20

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-uuid",
        "title": "ScalpMaster Pro EA",
        "description": "Advanced scalping EA",
        "price": 1000,
        "currency": "coins",
        "category": "ea",
        "seller": {
          "id": "user-uuid",
          "username": "protrader",
          "rating": 4.8
        },
        "stats": {
          "downloads": 234,
          "reviews": 42,
          "rating": 4.7
        },
        "images": ["url1", "url2"],
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Get Marketplace Item
```http
GET /api/marketplace/items/:id

Response: 200 OK
{
  "success": true,
  "data": {
    "item": {
      "id": "item-uuid",
      "title": "ScalpMaster Pro EA",
      "description": "Full description...",
      "price": 1000,
      "features": [
        "Automated trading",
        "Risk management",
        "Multi-timeframe"
      ],
      "requirements": {
        "platform": "MT4/MT5",
        "minDeposit": 1000,
        "leverage": "1:100"
      },
      "files": [
        {
          "name": "ScalpMaster.ex4",
          "size": 234567,
          "type": "application/octet-stream"
        }
      ],
      "reviews": [
        {
          "id": "review-uuid",
          "rating": 5,
          "comment": "Excellent EA!",
          "author": {
            "id": "user-uuid",
            "username": "happytrader"
          },
          "createdAt": "2025-01-05T00:00:00Z"
        }
      ]
    }
  }
}
```

#### Purchase Item
```http
POST /api/marketplace/items/:id/purchase

Request:
{
  "paymentMethod": "coins"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "purchase": {
      "id": "purchase-uuid",
      "itemId": "item-uuid",
      "price": 1000,
      "downloadUrl": "https://download.yoforex.net/...",
      "expiresAt": "2025-01-07T10:00:00Z"
    },
    "newBalance": 4000
  }
}
```

#### Publish Item
```http
POST /api/marketplace/publish

Request (multipart/form-data):
{
  "title": "My Trading System",
  "description": "Description...",
  "category": "ea",
  "price": 500,
  "features": ["feature1", "feature2"],
  "files": [File],
  "images": [File]
}

Response: 201 Created
{
  "success": true,
  "data": {
    "item": {
      "id": "new-item-uuid",
      "title": "My Trading System",
      "status": "pending_review"
    }
  }
}
```

### Messaging Endpoints

#### List Conversations
```http
GET /api/messages/conversations

Response: 200 OK
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-uuid",
        "participants": [
          {
            "id": "user-uuid",
            "username": "trader123",
            "avatar": "url"
          }
        ],
        "lastMessage": {
          "content": "Thanks for the EA!",
          "createdAt": "2025-01-06T09:00:00Z",
          "read": false
        },
        "unreadCount": 2
      }
    ]
  }
}
```

#### Get Conversation
```http
GET /api/messages/conversations/:id

Response: 200 OK
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv-uuid",
      "messages": [
        {
          "id": "msg-uuid",
          "content": "Hi, interested in your EA",
          "senderId": "user1-uuid",
          "createdAt": "2025-01-06T08:00:00Z",
          "read": true,
          "attachments": []
        }
      ],
      "participants": [...]
    }
  }
}
```

#### Send Message
```http
POST /api/messages/send

Request:
{
  "conversationId": "conv-uuid",
  "content": "Thanks for your interest!",
  "attachments": []
}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": {
      "id": "new-msg-uuid",
      "content": "Thanks for your interest!",
      "createdAt": "2025-01-06T10:00:00Z"
    }
  }
}
```

### Notification Endpoints

#### Get Notifications
```http
GET /api/notifications?unread=true

Response: 200 OK
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "type": "reply",
        "title": "New reply to your thread",
        "message": "Someone replied to 'Best EA for scalping?'",
        "data": {
          "threadId": "thread-uuid",
          "replyId": "reply-uuid"
        },
        "read": false,
        "createdAt": "2025-01-06T09:30:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

#### Mark Notification as Read
```http
PUT /api/notifications/:id/read

Response: 200 OK
{
  "success": true,
  "data": {
    "notification": {
      "id": "notif-uuid",
      "read": true
    }
  }
}
```

### Sweets Economy

#### Get Wallet Balance
```http
GET /api/sweets/balance

Response: 200 OK
{
  "success": true,
  "data": {
    "wallet": {
      "balance": 5000,
      "lockedBalance": 500,
      "availableBalance": 4500,
      "currency": "SWEETS",
      "loyaltyTier": "gold",
      "withdrawalFee": 0.03
    }
  }
}
```

#### Get Transaction History
```http
GET /api/sweets/transactions?page=1&limit=50

Response: 200 OK
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx-uuid",
        "type": "credit",
        "amount": 25,
        "trigger": "forum.thread.created",
        "description": "Thread creation reward",
        "balanceAfter": 5025,
        "createdAt": "2025-01-06T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 234
    }
  }
}
```

#### Request Withdrawal
```http
POST /api/sweets/withdraw

Request:
{
  "amount": 1000,
  "method": "paypal",
  "details": {
    "email": "user@example.com"
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "withdrawal": {
      "id": "wd-uuid",
      "amount": 1000,
      "fee": 30,
      "netAmount": 970,
      "status": "pending",
      "estimatedDate": "2025-01-09T00:00:00Z"
    }
  }
}
```

### Admin Endpoints

#### Get Admin Dashboard Stats
```http
GET /api/admin/dashboard/stats
Authorization: Required (Admin)

Response: 200 OK
{
  "success": true,
  "data": {
    "users": {
      "total": 10234,
      "active": 5678,
      "new": 234
    },
    "revenue": {
      "total": 50000,
      "month": 5000,
      "pending": 1234
    },
    "content": {
      "threads": 12345,
      "items": 567,
      "pendingReview": 23
    }
  }
}
```

#### Moderate Content
```http
POST /api/admin/moderate/:contentId

Request:
{
  "action": "approve",
  "reason": "Content meets guidelines"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "content": {
      "id": "content-uuid",
      "status": "approved",
      "moderatedBy": "admin-uuid",
      "moderatedAt": "2025-01-06T10:00:00Z"
    }
  }
}
```

#### Ban User
```http
POST /api/admin/users/:userId/ban

Request:
{
  "reason": "Violation of terms",
  "duration": 30,
  "unit": "days"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "status": "banned",
      "bannedUntil": "2025-02-05T00:00:00Z"
    }
  }
}
```

### Bot Endpoints

#### List Bots
```http
GET /api/admin/bots

Response: 200 OK
{
  "success": true,
  "data": {
    "bots": [
      {
        "id": "bot-uuid",
        "name": "Helper Bot",
        "type": "engagement",
        "status": "active",
        "stats": {
          "actions": 1234,
          "coinsSpent": 5678
        }
      }
    ]
  }
}
```

#### Create Bot
```http
POST /api/admin/bots

Request:
{
  "name": "Welcome Bot",
  "type": "greeting",
  "config": {
    "messageTemplate": "Welcome to YoForex!",
    "trigger": "user_signup"
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "bot": {
      "id": "new-bot-uuid",
      "name": "Welcome Bot",
      "status": "inactive"
    }
  }
}
```

## WebSocket Events

### Connection

```javascript
const socket = io('wss://yoforex.net', {
  auth: {
    token: sessionToken
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});
```

### Event Types

#### Notifications
```javascript
// Subscribe to notifications
socket.emit('notifications:subscribe');

// Receive new notification
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

#### Messages
```javascript
// Join conversation room
socket.emit('conversation:join', { conversationId });

// Receive new message
socket.on('message:new', (message) => {
  console.log('New message:', message);
});

// Typing indicator
socket.emit('typing:start', { conversationId });
socket.on('typing:user', ({ userId, conversationId }) => {
  console.log(`User ${userId} is typing...`);
});
```

#### Dashboard Updates
```javascript
// Subscribe to dashboard updates
socket.emit('dashboard:subscribe');

// Receive earnings update
socket.on('earnings:update', (data) => {
  console.log('Earnings updated:', data);
});

// Receive vault unlock
socket.on('vault:unlocked', (data) => {
  console.log('Vault unlocked:', data);
  // Show confetti animation
});
```

#### Forum Activity
```javascript
// Subscribe to thread updates
socket.emit('thread:subscribe', { threadId });

// Receive new reply
socket.on('thread:reply', (reply) => {
  console.log('New reply:', reply);
});

// Receive like update
socket.on('thread:liked', ({ threadId, likeCount }) => {
  console.log(`Thread liked. Total: ${likeCount}`);
});
```

## Error Codes

### Application Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH_REQUIRED | Authentication required | 401 |
| AUTH_INVALID | Invalid credentials | 401 |
| AUTH_EXPIRED | Session expired | 401 |
| PERMISSION_DENIED | Insufficient permissions | 403 |
| RESOURCE_NOT_FOUND | Resource not found | 404 |
| VALIDATION_ERROR | Validation failed | 400 |
| DUPLICATE_ENTRY | Resource already exists | 409 |
| RATE_LIMIT_EXCEEDED | Too many requests | 429 |
| INSUFFICIENT_COINS | Not enough coins | 402 |
| CONTENT_LOCKED | Content requires purchase | 402 |
| SERVER_ERROR | Internal server error | 500 |
| SERVICE_UNAVAILABLE | Service temporarily unavailable | 503 |

## Examples

### Complete Authentication Flow

```javascript
// 1. Register new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    username: 'newtrader'
  })
});

// 2. Verify email (user clicks link)
const verifyResponse = await fetch('/api/auth/verify-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'verification-token-from-email'
  })
});

// 3. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePass123!'
  })
});

// 4. Access protected endpoint
const profileResponse = await fetch('/api/user', {
  credentials: 'include'
});
```

### Forum Thread Creation with Coin Reward

```javascript
// 1. Create thread
const threadResponse = await fetch('/api/forum/threads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    title: 'My Trading Strategy',
    content: 'Here is my strategy...',
    categoryId: '1',
    tags: ['strategy', 'eurusd']
  })
});

const thread = await threadResponse.json();
// User automatically receives 25 coins

// 2. Check updated balance
const balanceResponse = await fetch('/api/sweets/balance', {
  credentials: 'include'
});

const wallet = await balanceResponse.json();
console.log(`New balance: ${wallet.data.wallet.balance} coins`);
```

### Marketplace Purchase Flow

```javascript
// 1. Search for items
const searchResponse = await fetch('/api/marketplace/items?category=ea&sort=popular');
const items = await searchResponse.json();

// 2. Get item details
const itemId = items.data.items[0].id;
const itemResponse = await fetch(`/api/marketplace/items/${itemId}`);
const item = await itemResponse.json();

// 3. Check if user has enough coins
const balanceResponse = await fetch('/api/sweets/balance');
const wallet = await balanceResponse.json();

if (wallet.data.wallet.availableBalance >= item.data.item.price) {
  // 4. Purchase item
  const purchaseResponse = await fetch(`/api/marketplace/items/${itemId}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      paymentMethod: 'coins'
    })
  });
  
  const purchase = await purchaseResponse.json();
  console.log(`Download URL: ${purchase.data.purchase.downloadUrl}`);
}
```

### WebSocket Real-Time Messaging

```javascript
// Initialize Socket.IO client
const socket = io('wss://yoforex.net', {
  auth: { token: sessionToken }
});

// Join conversation
socket.emit('conversation:join', { 
  conversationId: 'conv-123' 
});

// Send message
socket.emit('message:send', {
  conversationId: 'conv-123',
  content: 'Hello!',
  attachments: []
});

// Listen for new messages
socket.on('message:new', (message) => {
  appendMessageToUI(message);
});

// Show typing indicator
let typingTimer;
inputField.addEventListener('input', () => {
  socket.emit('typing:start', { conversationId: 'conv-123' });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing:stop', { conversationId: 'conv-123' });
  }, 1000);
});
```

### Error Handling Best Practices

```javascript
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (data.error?.code) {
        case 'AUTH_EXPIRED':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'INSUFFICIENT_COINS':
          // Show coin recharge modal
          showRechargeModal();
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // Show rate limit message
          const resetTime = response.headers.get('X-RateLimit-Reset');
          showRateLimitMessage(resetTime);
          break;
        default:
          // Show generic error
          showErrorToast(data.error?.message || 'An error occurred');
      }
      throw new Error(data.error?.message);
    }

    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

// Usage
try {
  const result = await apiRequest('/api/forum/threads', {
    method: 'POST',
    body: JSON.stringify(threadData)
  });
  console.log('Thread created:', result.data);
} catch (error) {
  // Error already handled in apiRequest
}
```

## SDK/Client Libraries

### JavaScript/TypeScript Client

```typescript
// Install: npm install @yoforex/api-client

import { YoForexClient } from '@yoforex/api-client';

const client = new YoForexClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://yoforex.net/api'
});

// Async/await syntax
const user = await client.users.getProfile();
const threads = await client.forum.listThreads({ category: 'general' });
const balance = await client.sweets.getBalance();

// WebSocket events
client.ws.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

## API Versioning

The API uses URL versioning. The current version is v1 (implicit).

Future versions will use explicit versioning:
- v1: `/api/endpoint` (current)
- v2: `/api/v2/endpoint` (future)

## Terms of Use

By using the YoForex API, you agree to:
- Not exceed rate limits
- Not scrape or harvest data
- Not use the API for illegal purposes
- Maintain user privacy
- Follow our Terms of Service

## Support

For API support:
- Email: api@yoforex.net
- Documentation: https://yoforex.net/docs/api
- Status Page: https://status.yoforex.net