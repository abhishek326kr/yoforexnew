import { db } from "../server/db";
import { users, profiles, userFollows, userBadges } from "../shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const testMembers = [
  { 
    username: 'JohnTrader', 
    email: 'john@test.com', 
    bio: 'Professional forex trader with 5+ years experience', 
    totalCoins: 2500,
    role: 'member',
    badges: ['early_adopter', 'active_trader']
  },
  { 
    username: 'SarahDev', 
    email: 'sarah@test.com', 
    bio: 'EA developer specializing in scalping strategies', 
    totalCoins: 5000,
    role: 'seller',
    badges: ['verified_developer', 'top_contributor']
  },
  { 
    username: 'MikeAnalyst', 
    email: 'mike@test.com', 
    bio: 'Technical analyst and market researcher', 
    totalCoins: 1800,
    role: 'member',
    badges: ['helpful_member']
  },
  { 
    username: 'EmmaScalper', 
    email: 'emma@test.com', 
    bio: 'Day trader focusing on major currency pairs', 
    totalCoins: 3200,
    role: 'verified',
    badges: ['verified_trader', 'active_trader']
  },
  { 
    username: 'AlexSwing', 
    email: 'alex@test.com', 
    bio: 'Swing trader with focus on fundamentals', 
    totalCoins: 750,
    role: 'member',
    badges: ['newcomer']
  },
  { 
    username: 'LisaMentor', 
    email: 'lisa@test.com', 
    bio: 'Trading mentor and educator', 
    totalCoins: 8500,
    role: 'premium',
    badges: ['premium_member', 'mentor', 'top_contributor']
  },
  { 
    username: 'DavidScalp', 
    email: 'david@test.com', 
    bio: 'High-frequency scalping specialist', 
    totalCoins: 4200,
    role: 'seller',
    badges: ['verified_developer', 'active_trader']
  },
  { 
    username: 'NancyNews', 
    email: 'nancy@test.com', 
    bio: 'News trader focusing on high-impact events', 
    totalCoins: 1500,
    role: 'member',
    badges: ['active_trader']
  },
  { 
    username: 'TomTrend', 
    email: 'tom@test.com', 
    bio: 'Trend following systems developer', 
    totalCoins: 6700,
    role: 'seller',
    badges: ['verified_developer', 'top_seller']
  },
  { 
    username: 'RachelRisk', 
    email: 'rachel@test.com', 
    bio: 'Risk management specialist', 
    totalCoins: 2900,
    role: 'verified',
    badges: ['verified_trader', 'helpful_member']
  },
  { 
    username: 'AdminUser', 
    email: 'admin@test.com', 
    bio: 'YoForex Platform Administrator', 
    totalCoins: 10000,
    role: 'admin',
    badges: ['admin', 'early_adopter']
  },
  { 
    username: 'ModeratorMike', 
    email: 'moderator@test.com', 
    bio: 'Community Moderator', 
    totalCoins: 5500,
    role: 'moderator',
    badges: ['moderator', 'helpful_member']
  }
];

async function seedMembers() {
  console.log("Starting member seeding...");
  
  try {
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const createdUsers = [];
    const now = new Date();
    
    for (let i = 0; i < testMembers.length; i++) {
      const member = testMembers[i];
      const userId = randomUUID();
      
      // Random creation date within last 3 months
      const randomDaysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
      
      // Random last active within last 24 hours
      const randomHoursAgo = Math.floor(Math.random() * 24);
      const lastActive = new Date(now.getTime() - randomHoursAgo * 60 * 60 * 1000);
      
      // Create user
      await db.insert(users).values({
        id: userId,
        username: member.username,
        email: member.email,
        password_hash: hashedPassword,
        totalCoins: member.totalCoins,
        level: Math.floor(member.totalCoins / 1000),
        role: member.role as any,
        status: 'active',
        badges: member.badges,
        createdAt,
        lastActive,
        auth_provider: 'email',
        is_email_verified: true,
        onboardingCompleted: true,
        reputationScore: Math.floor(Math.random() * 500) + 100,
      }).onConflictDoNothing();
      
      // Create profile
      await db.insert(profiles).values({
        userId,
        bio: member.bio,
      }).onConflictDoNothing();
      
      createdUsers.push({ id: userId, username: member.username });
      console.log(`Created member: ${member.username} (${member.role}) with ${member.totalCoins} coins`);
    }
    
    // Create some follow relationships
    console.log("\nCreating follow relationships...");
    
    // Everyone follows AdminUser
    const adminUser = createdUsers.find(u => u.username === 'AdminUser');
    if (adminUser) {
      for (const user of createdUsers) {
        if (user.username !== 'AdminUser') {
          await db.insert(userFollows).values({
            followerId: user.id,
            followingId: adminUser.id,
          }).onConflictDoNothing();
        }
      }
    }
    
    // SarahDev follows TomTrend and vice versa
    const sarah = createdUsers.find(u => u.username === 'SarahDev');
    const tom = createdUsers.find(u => u.username === 'TomTrend');
    if (sarah && tom) {
      await db.insert(userFollows).values([
        { followerId: sarah.id, followingId: tom.id },
        { followerId: tom.id, followingId: sarah.id },
      ]).onConflictDoNothing();
    }
    
    console.log("\n✅ Successfully seeded members!");
    console.log(`Total members created: ${testMembers.length}`);
    
  } catch (error) {
    console.error("Error seeding members:", error);
    process.exit(1);
  }
}

// Run the seeding
seedMembers().then(() => {
  console.log("\nSeeding complete!");
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});