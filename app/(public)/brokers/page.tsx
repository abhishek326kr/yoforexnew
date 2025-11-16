"use client";

import BrokersComingSoonClient from './BrokersComingSoonClient';
import { useEffect } from 'react';

// Client component - prevents any server-side rendering during build
export default function BrokerDirectoryPage() {
  // Set page metadata on client side for SEO
  useEffect(() => {
    document.title = "Broker Reviews Coming Soon | YoForex";
    
    // Update meta tags
    const updateMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };
    
    updateMeta('description', 'Our comprehensive broker review system is launching soon. Get ready to explore detailed analyses, user ratings, and expert insights on the best forex brokers for MT4/MT5 trading.');
    updateMeta('keywords', 'forex brokers, MT4 brokers, MT5 brokers, broker reviews, regulated brokers, coming soon');
  }, []);

  return <BrokersComingSoonClient />;
}