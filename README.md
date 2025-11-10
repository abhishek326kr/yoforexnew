# YoForex - Expert Advisor Forum & EA Marketplace

<div align="center">
  <img src="/public/og-image.svg" alt="YoForex Logo" width="200">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue)](https://www.postgresql.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey)](https://expressjs.com/)
  
  **The Premier Trading Community Platform for Forex Traders**
  
  [Live Demo](https://yoforex.net) • [Documentation](./docs) • [API Reference](./docs/API.md) • [Contributing](#contributing)
</div>

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Overview

YoForex is a comprehensive trading community platform designed for forex traders, featuring expert advisor (EA) marketplace, forum discussions, broker reviews, and a unique coin-based economy system. Built with modern web technologies, it provides a scalable, performant, and feature-rich environment for traders to share knowledge, trade strategies, and monetize their expertise.

## Features

- **Forum System** - 60+ hierarchical categories, SEO-optimized URLs, voting, best answers
- **Content Marketplace** - Expert Advisors, indicators, strategies with coin-based monetization
- **Broker Reviews** - User reviews, ratings, comparison tools
- **Coin Economy** - Earn coins for contributions, spend on premium content
- **Retention Dashboard** - "Your Trading Journey" with vault bonuses, loyalty tiers, badges
- **Real-Time Features** - WebSocket notifications, live updates, confetti animations
- **Authentication** - Email/password + Google OAuth via Firebase
- **Email System** - 58+ notification types via Hostinger SMTP
- **Analytics** - Google Tag Manager, GA4, activity tracking

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Server Components, ISR)
- **Backend:** Express.js (194 REST endpoints)
- **Database:** Neon PostgreSQL with Drizzle ORM
- **Real-Time:** Socket.IO WebSocket server
- **Styling:** TailwindCSS + shadcn/ui components
- **Testing:** Vitest (15 unit tests, 100% pass rate)

## Quick Start

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd yoforex
   npm install
   ```

2. **Environment Variables**
   Create `.env` file with:
   ```env
   DATABASE_URL=your_neon_postgres_url
   SESSION_SECRET=random_string_here
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=your_email
   SMTP_PASSWORD=your_password
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```
   
   Access at http://localhost:5000

### Admin Account

**Email:** Admin@yoforex.net  
**Password:** Arijit@101

## Project Structure

```
yoforex/
├── app/                    # Next.js 16 App Router
│   ├── dashboard/          # User dashboard & retention system
│   ├── forum/              # Forum pages
│   ├── content/            # Content marketplace
│   └── api/                # Next.js API routes (proxied to Express)
├── server/                 # Express.js backend
│   ├── routes.ts           # 194 API endpoints
│   ├── services/           # Business logic (vault, loyalty, badges, etc)
│   └── jobs/               # Cron jobs
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle database schema
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## Key Features

### Retention Dashboard ("Your Trading Journey")

8 interactive widgets:
- **Earnings Counter** - Live earnings + 7-day sparkline
- **Growth Vault** - 10% auto-bonus with 30-day unlock
- **Loyalty Shield** - 5-tier progression (7% → 0% fees)
- **Badge Wall** - 6 badge types with auto-rewards
- **Referral Meter** - 5+ active = 5% permanent bonus
- **Health Score** - AI-powered engagement tips
- **Activity Heatmap** - 24h × 7-day D3.js visualization
- **Earnings Pie Chart** - Source breakdown (Recharts)

### Coin Economy

**Earning Opportunities:**
- Thread created: 25 ₡
- Reply posted: 10 ₡
- Answer accepted: 50 ₡ (author)
- Content published: 100-500 ₡
- Referral signup: 100 ₡

**Vault Bonus:** 10% of all earnings locked for 30 days (encourages retention)

**Loyalty Tiers:**
- Bronze (0-21 days): 7% withdrawal fee
- Silver (22-44 days): 5% fee
- Gold (45-66 days): 3% fee
- Platinum (67-89 days): 1% fee
- Diamond (90+ days): 0% fee

### Real-Time Features

- **WebSocket Server** - `/ws/dashboard` for live updates
- **Confetti Animations** - Vault unlocks, badge achievements
- **Toast Notifications** - Earnings, levels, milestones
- **AI Nudges** - Behavioral engagement suggestions
- **Abandonment Emails** - 3-tier sequence (day 2, 5, 10)

## Testing

```bash
# Run unit tests (15 tests)
npm test

# Performance audit
npm run audit:performance

# Build for production
npm run build
```

## Recent Fixes

### React Hydration (January 2025)
- ✅ Fixed React Error #418 hydration mismatches
- ✅ TimeAgo component now handles SSR/client differences
- ✅ StatsBar component properly initialized
- ✅ No console warnings in production

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

### Core Documentation
- 📘 [Architecture Overview](./docs/ARCHITECTURE.md) - System design and technical architecture
- 📗 [API Reference](./docs/API.md) - Complete API documentation with examples
- 📙 [Database Schema](./docs/DATABASE.md) - Database design and relationships
- 📕 [Setup Guide](./docs/SETUP.md) - Detailed installation instructions

### Feature Documentation
- 🎯 [Features Guide](./docs/FEATURES.md) - Detailed feature documentation
- 💻 [Development Guide](./docs/DEVELOPMENT.md) - Developer guidelines and best practices
- 🧪 [Testing Guide](./docs/TESTING.md) - Testing strategies and procedures
- 🚀 [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions

### User Documentation
- 👤 [User Guide](./docs/USER_GUIDE.md) - End-user documentation
- 👨‍💼 [Admin Guide](./docs/ADMIN_GUIDE.md) - Administrator documentation
- 🔧 [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

### Project Information
- 📝 [Changelog](./docs/CHANGELOG.md) - Version history and release notes
- 🗺️ [Roadmap](./docs/ROADMAP.md) - Future development plans

## Contributing

We welcome contributions from the community! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- 📖 [Documentation](./docs)
- 📧 [Email Support](mailto:support@yoforex.net)
- 🐛 [Bug Reports](https://github.com/yourusername/yoforex/issues)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ by the YoForex Team</strong>
  <br>
  © 2025 YoForex. All rights reserved.
</div>
