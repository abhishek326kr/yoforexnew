import { db } from "../server/db";
import { content } from "@shared/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";

/**
 * Script to fix marketplace images by setting default images for products without images
 * This maps each category to an appropriate stock image that was downloaded
 */

// Define the default image URLs based on category and type
const DEFAULT_IMAGES: Record<string, string> = {
  // EA categories
  "scalping-eas": "/api/static/stock_images/scalping_trading_fas_1d092148.jpg",
  "grid-trading-eas": "/api/static/stock_images/grid_trading_strateg_fb77417b.jpg",
  "news-trading-eas": "/api/static/stock_images/news_trading_economi_249f9021.jpg",
  "trend-following-eas": "/api/static/stock_images/trend_following_trad_d6214ad7.jpg",
  "martingale-eas": "/api/static/stock_images/martingale_strategy__e1ae2a64.jpg",
  
  // Indicator categories  
  "oscillators-momentum": "/api/static/stock_images/forex_trading_chart__9d7e0276.jpg",
  "sr-tools": "/api/static/stock_images/forex_trading_chart__47634fdd.jpg",
  "volume-indicators": "/api/static/stock_images/forex_trading_chart__9d7e0276.jpg",
  
  // Template categories
  "template-packs": "/api/static/stock_images/forex_trading_chart__69ad25ee.jpg",
  
  // Defaults by type
  "_ea_default": "/api/static/stock_images/automated_trading_ro_e6dc98af.jpg",
  "_indicator_default": "/api/static/stock_images/forex_trading_chart__9d7e0276.jpg",
  "_template_default": "/api/static/stock_images/forex_trading_chart__69ad25ee.jpg",
  "_article_default": "/api/static/stock_images/forex_trading_chart__47634fdd.jpg",
};

async function fixMarketplaceImages() {
  console.log("🔧 Starting marketplace image fix...");
  
  try {
    // Fetch all content that has no images
    const contentWithoutImages = await db
      .select()
      .from(content)
      .where(
        and(
          or(
            isNull(content.imageUrls),
            eq(sql`cardinality(${content.imageUrls})`, 0)
          ),
          isNull(content.postLogoUrl)
        )
      );
    
    console.log(`Found ${contentWithoutImages.length} products without images`);
    
    // Update each product with appropriate default image
    for (const item of contentWithoutImages) {
      let imageUrl = "";
      const category = item.category?.toLowerCase() || "";
      
      // First try exact category match
      if (DEFAULT_IMAGES[category]) {
        imageUrl = DEFAULT_IMAGES[category];
      } 
      // Then try type-based default
      else if (DEFAULT_IMAGES[`_${item.type}_default`]) {
        imageUrl = DEFAULT_IMAGES[`_${item.type}_default`];
      }
      // Final fallback
      else {
        imageUrl = DEFAULT_IMAGES["_ea_default"];
      }
      
      // Update the product with the default image
      await db
        .update(content)
        .set({
          imageUrls: [imageUrl],
          updatedAt: new Date(),
        })
        .where(eq(content.id, item.id));
      
      console.log(`✅ Updated ${item.title} (${item.type}/${item.category}) with default image`);
    }
    
    console.log("🎉 Marketplace image fix completed successfully!");
    
    // Also log a summary of what was updated
    const summary = contentWithoutImages.reduce((acc, item) => {
      const key = `${item.type}/${item.category}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("\n📊 Summary of updates:");
    Object.entries(summary).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} products`);
    });
    
  } catch (error) {
    console.error("❌ Error fixing marketplace images:", error);
    process.exit(1);
  }
}

// Run the script
fixMarketplaceImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });