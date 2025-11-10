import { Metadata } from "next";
import RechargeClient from "./RechargeClient";
import { RECHARGE_PACKAGES } from "../../shared/coinUtils";

export const metadata: Metadata = {
  title: "Recharge Coins | YoForex",
  description: "Purchase gold coins to unlock premium content, support creators, and access exclusive features on YoForex.",
  keywords: "recharge, buy coins, gold coins, premium content, stripe payment, cryptocurrency, USDT, trading platform",
  openGraph: {
    title: "Recharge Coins | YoForex",
    description: "Purchase gold coins to unlock premium content, support creators, and access exclusive features on YoForex.",
    type: "website",
    siteName: "YoForex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recharge Coins | YoForex",
    description: "Purchase gold coins to unlock premium content, support creators, and access exclusive features on YoForex.",
  },
};

export default function RechargePage() {
  return <RechargeClient initialPackages={RECHARGE_PACKAGES} />;
}
