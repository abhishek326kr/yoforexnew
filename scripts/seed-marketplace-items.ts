#!/usr/bin/env tsx
import { db } from '../server/db';
import { 
  content, 
  contentPurchases, 
  contentReviews,
  users,
  coinTransactions
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const EA_ITEMS = [
  {
    title: "TrendMaster Pro EA - Advanced Trend Following System",
    description: `<h2>Professional Trend Following Expert Advisor</h2>
    <p>TrendMaster Pro is a sophisticated Expert Advisor designed for serious traders who want to capture major market trends. This EA uses multiple timeframe analysis combined with advanced volatility filters to identify high-probability trend entries.</p>
    
    <h3>Key Features:</h3>
    <ul>
      <li>Multi-timeframe trend confirmation</li>
      <li>Advanced money management with dynamic lot sizing</li>
      <li>Built-in news filter to avoid volatile events</li>
      <li>Trailing stop with breakeven functionality</li>
      <li>Support for all major currency pairs</li>
    </ul>
    
    <h3>Performance Statistics:</h3>
    <ul>
      <li>Average monthly return: 8-12%</li>
      <li>Maximum drawdown: 15%</li>
      <li>Win rate: 65%</li>
      <li>Profit factor: 2.3</li>
    </ul>
    
    <h3>Requirements:</h3>
    <ul>
      <li>Minimum deposit: $1000</li>
      <li>Recommended leverage: 1:100</li>
      <li>Works on MT4 and MT5</li>
    </ul>`,
    type: 'ea',
    category: 'Trend Following',
    priceCoins: 500,
    isFree: false,
    platform: 'Both',
    version: '2.5',
    tags: ['trend', 'professional', 'multi-timeframe', 'verified'],
  },
  {
    title: "ScalpKing Ultra - High-Frequency Scalping EA",
    description: `<h2>Ultra-Fast Scalping Expert Advisor</h2>
    <p>ScalpKing Ultra is designed for traders who prefer quick, small profits throughout the day. Using advanced price action analysis and market microstructure, this EA executes dozens of trades daily.</p>
    
    <h3>Features:</h3>
    <ul>
      <li>Sub-second execution speed</li>
      <li>Spread filter for optimal entry</li>
      <li>Session-based trading</li>
      <li>Low drawdown strategy</li>
    </ul>`,
    type: 'ea',
    category: 'Scalping',
    priceCoins: 750,
    isFree: false,
    platform: 'MT5',
    version: '3.0',
    tags: ['scalping', 'high-frequency', 'low-risk'],
  },
  {
    title: "GridMaster Gold - Intelligent Grid Trading System",
    description: `<h2>Smart Grid Trading EA for Gold</h2>
    <p>GridMaster Gold revolutionizes grid trading with intelligent position management and dynamic grid adjustment based on market volatility.</p>
    
    <h3>Unique Features:</h3>
    <ul>
      <li>Adaptive grid spacing</li>
      <li>Anti-martingale option</li>
      <li>Drawdown protection</li>
      <li>Optimized for XAUUSD</li>
    </ul>`,
    type: 'ea',
    category: 'Grid',
    priceCoins: 999,
    isFree: false,
    platform: 'MT4',
    version: '4.1',
    tags: ['grid', 'gold', 'xauusd', 'adaptive'],
  },
  {
    title: "NewsTrader AI - Economic Event Trading Bot",
    description: `<h2>AI-Powered News Trading System</h2>
    <p>NewsTrader AI analyzes economic calendars and executes trades based on high-impact news events with machine learning prediction.</p>`,
    type: 'ea',
    category: 'News',
    priceCoins: 1200,
    isFree: false,
    platform: 'Both',
    version: '1.8',
    tags: ['news', 'AI', 'economic-events'],
  },
  {
    title: "Fibonacci Retracement Pro Indicator",
    description: `<h2>Advanced Fibonacci Analysis Tool</h2>
    <p>Automatically identifies and draws Fibonacci retracements with alert system for key levels.</p>`,
    type: 'indicator',
    category: 'Technical Analysis',
    priceCoins: 150,
    isFree: false,
    platform: 'Both',
    version: '2.0',
    tags: ['fibonacci', 'indicator', 'alerts'],
  },
  {
    title: "Free Moving Average Cross EA",
    description: `<h2>Simple MA Crossover Strategy</h2>
    <p>A basic but effective Expert Advisor using moving average crossovers. Perfect for beginners learning automated trading.</p>`,
    type: 'ea',
    category: 'Trend Following',
    priceCoins: 0,
    isFree: true,
    platform: 'MT4',
    version: '1.0',
    tags: ['free', 'beginner', 'moving-average'],
  },
  {
    title: "Multi-Pair Dashboard Indicator",
    description: `<h2>Monitor 28 Pairs Simultaneously</h2>
    <p>Professional dashboard showing strength, momentum, and trading signals across all major pairs.</p>`,
    type: 'indicator',
    category: 'Dashboard',
    priceCoins: 299,
    isFree: false,
    platform: 'MT5',
    version: '3.2',
    tags: ['dashboard', 'multi-pair', 'professional'],
  },
  {
    title: "Martingale Recovery EA - Risk Management Edition",
    description: `<h2>Safe Martingale with Limits</h2>
    <p>Modified martingale strategy with maximum position limits and equity protection.</p>`,
    type: 'ea',
    category: 'Martingale',
    priceCoins: 450,
    isFree: false,
    platform: 'Both',
    version: '2.1',
    tags: ['martingale', 'recovery', 'risk-management'],
  },
  {
    title: "Support Resistance Auto Detector",
    description: `<h2>Automatic S/R Level Detection</h2>
    <p>Identifies key support and resistance levels using multiple algorithms and historical data.</p>`,
    type: 'indicator',
    category: 'Technical Analysis',
    priceCoins: 0,
    isFree: true,
    platform: 'MT4',
    version: '1.5',
    tags: ['free', 'support-resistance', 'levels'],
  },
  {
    title: "Crypto Trading Bot - BTC/ETH Specialist",
    description: `<h2>Cryptocurrency Trading EA</h2>
    <p>Specialized EA for trading Bitcoin and Ethereum with volatility-based strategies.</p>`,
    type: 'ea',
    category: 'Cryptocurrency',
    priceCoins: 850,
    isFree: false,
    platform: 'MT5',
    version: '1.2',
    tags: ['crypto', 'bitcoin', 'ethereum'],
  }
];

const SAMPLE_REVIEWS = [
  { rating: 5, review: "Excellent EA! Works exactly as described. Great support from the developer." },
  { rating: 4, review: "Good performance overall. Had some minor issues initially but developer helped resolve them quickly." },
  { rating: 5, review: "Best purchase I've made. Consistent profits and low drawdown. Highly recommended!" },
  { rating: 3, review: "Works okay but needs optimization for different market conditions." },
  { rating: 5, review: "Amazing results! Already made back the purchase price in the first week." },
  { rating: 4, review: "Solid EA with good risk management. Documentation could be better." },
  { rating: 5, review: "Professional quality tool. The developer is very responsive and helpful." },
];

async function seedMarketplaceData() {
  console.log('🌱 Starting marketplace data seeding...\n');
  
  try {
    // Get or create test users
    console.log('Creating test users...');
    const testUsers = [];
    
    for (let i = 1; i <= 5; i++) {
      const userId = randomUUID();
      const username = `seller${i}`;
      
      // Check if user exists
      const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
      
      if (existing.length === 0) {
        const [user] = await db.insert(users).values({
          id: userId,
          username,
          email: `${username}@yoforex.com`,
          password_hash: '$2a$10$YourHashHere', // Placeholder hash
          totalCoins: 5000,
          role: 'member',
          status: 'active',
        }).returning();
        testUsers.push(user);
        console.log(`  ✅ Created user: ${username}`);
      } else {
        testUsers.push(existing[0]);
        console.log(`  ℹ️ User exists: ${username}`);
      }
    }
    
    // Create marketplace items
    console.log('\n📦 Creating marketplace items...');
    const createdItems = [];
    
    for (const [index, item] of EA_ITEMS.entries()) {
      const authorIndex = index % testUsers.length;
      const author = testUsers[authorIndex];
      
      // Generate slug from title
      const slug = item.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Check if content already exists
      const existing = await db.select().from(content).where(eq(content.slug, slug)).limit(1);
      
      if (existing.length === 0) {
        const [created] = await db.insert(content).values({
          id: randomUUID(),
          slug,
          title: item.title,
          description: item.description,
          type: item.type as any,
          category: item.category,
          priceCoins: item.priceCoins,
          isFree: item.isFree,
          status: 'approved',
          authorId: author.id,
          views: Math.floor(Math.random() * 1000) + 100,
          downloads: Math.floor(Math.random() * 100) + 10,
          likes: Math.floor(Math.random() * 50) + 5,
          hashtags: item.tags,
          focusKeyword: item.tags[0],
          autoMetaDescription: item.description.substring(0, 160).replace(/<[^>]*>/g, ''),
          imageUrls: [`https://placehold.co/600x400/4A90E2/ffffff?text=${encodeURIComponent(item.title.substring(0, 20))}`],
          tradingMetadata: {
            platform: item.platform,
            version: item.version,
          },
        }).returning();
        
        createdItems.push(created);
        console.log(`  ✅ Created: ${item.title}`);
      } else {
        createdItems.push(existing[0]);
        console.log(`  ℹ️ Exists: ${item.title}`);
      }
    }
    
    // Create sample purchases
    console.log('\n💰 Creating sample purchases...');
    const buyers = await db.select().from(users)
      .where(eq(users.role, 'member'))
      .limit(10);
    
    if (buyers.length > 0) {
      for (const item of createdItems.slice(0, 5)) {
        if (!item.isFree && item.priceCoins > 0) {
          const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
          
          // Check if already purchased
          const existingPurchase = await db.select().from(contentPurchases)
            .where(eq(contentPurchases.contentId, item.id))
            .where(eq(contentPurchases.buyerId, randomBuyer.id))
            .limit(1);
          
          if (existingPurchase.length === 0 && randomBuyer.id !== item.authorId) {
            // Create coin transaction
            const [transaction] = await db.insert(coinTransactions).values({
              userId: randomBuyer.id,
              type: 'spend',
              amount: item.priceCoins,
              description: `Purchased: ${item.title}`,
              status: 'completed',
            }).returning();
            
            // Create purchase record
            await db.insert(contentPurchases).values({
              contentId: item.id,
              buyerId: randomBuyer.id,
              sellerId: item.authorId,
              priceCoins: item.priceCoins,
              transactionId: transaction.id,
            });
            
            console.log(`  ✅ Purchase: ${randomBuyer.username} bought "${item.title.substring(0, 30)}..."`);
          }
        }
      }
    }
    
    // Create sample reviews
    console.log('\n⭐ Creating sample reviews...');
    for (const item of createdItems.slice(0, 7)) {
      const numReviews = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numReviews && i < buyers.length; i++) {
        const reviewer = buyers[i];
        const reviewData = SAMPLE_REVIEWS[Math.floor(Math.random() * SAMPLE_REVIEWS.length)];
        
        // Check if review exists
        const existingReview = await db.select().from(contentReviews)
          .where(eq(contentReviews.contentId, item.id))
          .where(eq(contentReviews.userId, reviewer.id))  // Fixed: use userId
          .limit(1);
        
        if (existingReview.length === 0 && reviewer.id !== item.authorId) {
          await db.insert(contentReviews).values({
            contentId: item.id,
            userId: reviewer.id,  // Fixed: use userId instead of reviewerId
            rating: reviewData.rating,
            review: reviewData.review,
          });
          
          console.log(`  ✅ Review: ${reviewer.username} reviewed "${item.title.substring(0, 30)}..." (${reviewData.rating}⭐)`);
        }
      }
    }
    
    console.log('\n✨ Marketplace seeding complete!');
    
    // Show summary
    const contentCount = await db.select({ count: sql<number>`count(*)::int` }).from(content);
    const purchaseCount = await db.select({ count: sql<number>`count(*)::int` }).from(contentPurchases);
    const reviewCount = await db.select({ count: sql<number>`count(*)::int` }).from(contentReviews);
    
    console.log('\n📊 Summary:');
    console.log(`  - Total products: ${contentCount[0]?.count || 0}`);
    console.log(`  - Total purchases: ${purchaseCount[0]?.count || 0}`);
    console.log(`  - Total reviews: ${reviewCount[0]?.count || 0}`);
    
  } catch (error: any) {
    console.error('❌ Error seeding marketplace data:', error.message);
    process.exit(1);
  }
}

seedMarketplaceData().catch(console.error);