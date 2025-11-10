import { db } from "../server/db";
import { forumThreads } from "../shared/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

async function createMissingThreads() {
  try {
    console.log("Creating missing XAUUSD threads...");
    
    // Thread 1: XAUUSD Analysis - Why Gold Will Hit $2,200 This Month
    const thread1Slug = "xauusd-analysis-why-gold-will-hit-2200-this-month";
    
    // Check if thread already exists
    const [existingThread1] = await db.select().from(forumThreads).where(eq(forumThreads.slug, thread1Slug));
    
    if (!existingThread1) {
      const thread1 = {
        id: crypto.randomUUID(),
        authorId: "866f4832-a46b-44de-9d25-2279ee3eecc7", // Using existing user ID from test script
        categorySlug: "forex-indicators-mt4-mt5",
        subcategorySlug: null,
        title: "XAUUSD Analysis - Why Gold Will Hit $2,200 This Month",
        body: `## Expert Analysis: Gold's Path to $2,200

Based on my technical and fundamental analysis, I believe gold (XAUUSD) is poised to reach $2,200 within this month. Here's my comprehensive breakdown:

### Technical Analysis

**Current Price Action**
- Gold is currently forming a bullish flag pattern on the daily chart
- Strong support established at $2,030 level
- RSI showing positive divergence on the 4H timeframe
- Moving averages (50 and 200 MA) showing bullish alignment

**Key Levels to Watch**
- **Support**: $2,030, $2,015, $2,000
- **Resistance**: $2,070, $2,100, $2,150
- **Target**: $2,200 (measured move from flag pattern)

### Fundamental Drivers

1. **Federal Reserve Pivot**
   - Market expecting rate cuts in Q2 2025
   - Dollar weakness supporting gold prices
   - Real yields turning negative

2. **Geopolitical Tensions**
   - Ongoing global uncertainties driving safe-haven demand
   - Central bank gold buying at record levels
   - De-dollarization trends accelerating

3. **Inflation Concerns**
   - Sticky inflation above Fed targets
   - Gold as traditional inflation hedge
   - Energy prices supporting inflationary pressures

### Trading Strategy

**Entry Points**
- Buy on dips to $2,030-$2,040 zone
- Scale in positions on retracements
- Use pending orders for better entries

**Risk Management**
- Stop Loss: Below $2,000 (psychological level)
- Take Profit 1: $2,100 (50% position)
- Take Profit 2: $2,150 (25% position)
- Take Profit 3: $2,200 (25% position)

### EA Settings for Gold Trading

For those using Expert Advisors:
- Timeframe: H1 or H4
- Lot size: 0.01 per $1,000 balance
- Max spread: 30 points
- Trading hours: London and NY sessions
- Avoid news: Disable 30 mins before/after high-impact news

### Conclusion

The confluence of technical and fundamental factors strongly suggests gold will test $2,200 this month. However, always remember to trade with proper risk management and never risk more than you can afford to lose.

**What's your view on gold? Share your analysis below!**

*Disclaimer: This is not financial advice. Always do your own research and trade responsibly.*`,
        slug: thread1Slug,
        focusKeyword: "XAUUSD analysis",
        metaDescription: "Expert technical and fundamental analysis on why gold (XAUUSD) is likely to reach $2,200 this month. Includes trading strategies and EA settings.",
        metaTitle: "XAUUSD Analysis - Why Gold Will Hit $2,200 This Month | YoForex",
        metaKeywords: "XAUUSD, gold analysis, gold price prediction, forex gold, XAU/USD trading, gold $2200",
        threadType: "discussion" as const,
        seoExcerpt: "Comprehensive analysis on gold's path to $2,200 including technical patterns, fundamental drivers, and trading strategies.",
        primaryKeyword: "XAUUSD analysis",
        language: "en",
        instruments: ["XAUUSD"],
        timeframes: ["H1", "H4", "D1"],
        strategies: ["trend-following", "support-resistance", "breakout"],
        platform: "MT4/MT5",
        broker: "Any regulated broker",
        riskNote: "High volatility expected. Use proper risk management.",
        hashtags: ["#XAUUSD", "#goldtrading", "#forexgold", "#technicalanalysis"],
        attachmentUrls: [],
        contentHtml: null,
        attachments: [],
        isPinned: false,
        isLocked: false,
        isSolved: false,
        views: 890,
        replyCount: 12,
        likeCount: 45,
        bookmarkCount: 18,
        shareCount: 7,
        lastActivityAt: new Date(),
        status: "approved" as const,
        moderatedBy: null,
        moderatedAt: null,
        rejectionReason: null,
        publishedAt: new Date(),
        engagementScore: 75,
        lastScoreUpdate: new Date(),
        helpfulVotes: 23,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(),
      };
      
      await db.insert(forumThreads).values(thread1);
      console.log("✅ Created thread 1:", thread1Slug);
    } else {
      console.log("ℹ️ Thread 1 already exists:", thread1Slug);
    }
    
    // Thread 2: XAUUSD M1 Scalping - Stable Set File for Gold Trading
    const thread2Slug = "xauusd-m1-scalping-stable-set-file-for-gold-trading";
    
    // Check if thread already exists
    const [existingThread2] = await db.select().from(forumThreads).where(eq(forumThreads.slug, thread2Slug));
    
    if (!existingThread2) {
      const thread2 = {
        id: crypto.randomUUID(),
        authorId: "866f4832-a46b-44de-9d25-2279ee3eecc7",
        categorySlug: "expert-advisors-mt4",
        subcategorySlug: null,
        title: "XAUUSD M1 Scalping - Stable Set File for Gold Trading",
        body: `## XAUUSD M1 Scalping Strategy - Proven Set File

After months of optimization and forward testing, I'm sharing my stable set file for XAUUSD M1 scalping. This configuration has shown consistent results across different market conditions.

### Performance Overview

**Backtesting Results (2024-2025)**
- Total Profit: +2,847 pips
- Win Rate: 68%
- Profit Factor: 1.85
- Maximum Drawdown: 12%
- Average Trade Duration: 8 minutes
- Daily Target: 20-30 pips

### Strategy Components

**1. Entry Signals**
- RSI Oversold/Overbought levels (customized for M1)
- Bollinger Band squeeze detection
- Volume spike confirmation
- Spread filter (max 25 points)

**2. Exit Rules**
- Fixed TP: 5 pips (scalping target)
- Fixed SL: 8 pips (tight stop)
- Trailing Stop: Activates at 3 pips profit
- Time-based exit: Close after 15 minutes

### Optimized Set File Parameters

\`\`\`
=== MAIN SETTINGS ===
MagicNumber=123456
LotSize=0.01
MaxSpread=25
UseMoneyManagement=true
RiskPercent=1.0

=== INDICATOR SETTINGS ===
RSI_Period=9
RSI_Overbought=75
RSI_Oversold=25
BB_Period=20
BB_Deviation=2.0
UseVolumeFilter=true
VolumeMultiplier=1.5

=== TRADE MANAGEMENT ===
TakeProfit=50 (5 pips)
StopLoss=80 (8 pips)
TrailingStop=30 (3 pips)
TrailingStep=10 (1 pip)
BreakEven=30 (3 pips)
MaxTrades=3
MaxDailyLoss=50 (5%)

=== TIME SETTINGS ===
StartHour=8 (London Open)
EndHour=20 (NY Close)
FridayCloseHour=18
AvoidNews=true
NewsMinutesBefore=30
NewsMinutesAfter=30
\`\`\`

### Important Notes

**Broker Requirements**
- ECN or Raw spread account recommended
- Low commission (max $7 per lot RT)
- Fast execution (< 50ms)
- Allow scalping and hedging

**VPS Recommendations**
- Latency < 10ms to broker server
- Minimum 1GB RAM
- Stable connection essential

### Risk Management

⚠️ **Critical Rules for Success**:
1. Never risk more than 1% per trade
2. Stop trading after 3 consecutive losses
3. Daily loss limit: 5% of account
4. Don't trade during high-impact news
5. Reduce lot size during volatile periods

### Live Trading Results

**Week 1**: +147 pips
**Week 2**: +203 pips
**Week 3**: +89 pips (NFP week, reduced trading)
**Week 4**: +175 pips

**Monthly Total**: +614 pips (6.14% account growth)

### Installation Guide

1. Copy the .set file to MT4/MT5 Experts folder
2. Attach EA to XAUUSD M1 chart
3. Load the set file
4. Ensure AutoTrading is enabled
5. Monitor for first 24 hours

### Download Link

[Download Set File] - *Link will be added after verification*

### Community Feedback

Please test on demo first and share your results. I'm continuously optimizing these settings based on market conditions and community feedback.

**Questions or suggestions? Let's discuss below!**

*Disclaimer: Past performance doesn't guarantee future results. Trade at your own risk.*`,
        slug: thread2Slug,
        focusKeyword: "XAUUSD M1 scalping",
        metaDescription: "Stable and proven set file for XAUUSD M1 scalping with 68% win rate. Includes optimized parameters and risk management rules.",
        metaTitle: "XAUUSD M1 Scalping - Stable Set File for Gold Trading | YoForex",
        metaKeywords: "XAUUSD scalping, M1 scalping, gold scalping EA, set file, MT4 scalping, forex scalping",
        threadType: "guide" as const,
        seoExcerpt: "Download stable set file for XAUUSD M1 scalping with proven results. 68% win rate and comprehensive risk management.",
        primaryKeyword: "XAUUSD scalping",
        language: "en",
        instruments: ["XAUUSD"],
        timeframes: ["M1"],
        strategies: ["scalping", "mean-reversion"],
        platform: "MT4/MT5",
        broker: "ECN brokers recommended",
        riskNote: "Scalping requires low spreads and fast execution. Test on demo first.",
        hashtags: ["#scalping", "#XAUUSD", "#M1", "#setfile", "#goldscalping"],
        attachmentUrls: [],
        contentHtml: null,
        attachments: [],
        isPinned: false,
        isLocked: false,
        isSolved: false,
        views: 1450,
        replyCount: 34,
        likeCount: 67,
        bookmarkCount: 42,
        shareCount: 15,
        lastActivityAt: new Date(),
        status: "approved" as const,
        moderatedBy: null,
        moderatedAt: null,
        rejectionReason: null,
        publishedAt: new Date(),
        engagementScore: 125,
        lastScoreUpdate: new Date(),
        helpfulVotes: 48,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(),
      };
      
      await db.insert(forumThreads).values(thread2);
      console.log("✅ Created thread 2:", thread2Slug);
    } else {
      console.log("ℹ️ Thread 2 already exists:", thread2Slug);
    }
    
    console.log("\n✅ Missing threads have been created successfully!");
    console.log("\nThread URLs:");
    console.log("1. /thread/xauusd-analysis-why-gold-will-hit-2200-this-month");
    console.log("2. /thread/xauusd-m1-scalping-stable-set-file-for-gold-trading");
    
  } catch (error) {
    console.error("❌ Error creating threads:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
createMissingThreads();