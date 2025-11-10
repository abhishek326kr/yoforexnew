'use client';

import { useState } from 'react';
import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  Link2, 
  Mail, 
  MessageCircle,
  Share2,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { toast } from '../../hooks/use-toast';

interface SocialShareProps {
  url?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  via?: string;
  className?: string;
  variant?: 'button' | 'dropdown' | 'inline';
}

export function SocialShare({
  url,
  title = 'Check this out on YoForex',
  description = '',
  hashtags = ['forex', 'trading', 'EA'],
  via = 'YoForex',
  className = '',
  variant = 'dropdown'
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  
  // Use current URL if not provided
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://yoforex.net');
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.map(tag => tag.replace('#', '')).join(',');

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=${via}&hashtags=${hashtagString}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'The link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try selecting and copying the link manually.',
        variant: 'destructive',
      });
    }
  };

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">Share:</span>
        <button
          onClick={() => openShareWindow(shareLinks.twitter)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Share on Twitter"
          data-testid="share-twitter"
        >
          <Twitter className="w-4 h-4" />
        </button>
        <button
          onClick={() => openShareWindow(shareLinks.facebook)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Share on Facebook"
          data-testid="share-facebook"
        >
          <Facebook className="w-4 h-4" />
        </button>
        <button
          onClick={() => openShareWindow(shareLinks.linkedin)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Share on LinkedIn"
          data-testid="share-linkedin"
        >
          <Linkedin className="w-4 h-4" />
        </button>
        <button
          onClick={() => openShareWindow(shareLinks.whatsapp)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Share on WhatsApp"
          data-testid="share-whatsapp"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
        <button
          onClick={handleCopyLink}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Copy link"
          data-testid="share-copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <Button
          onClick={() => openShareWindow(shareLinks.twitter)}
          variant="outline"
          className="justify-start"
          data-testid="share-twitter-button"
        >
          <Twitter className="w-4 h-4 mr-2" />
          Share on Twitter
        </Button>
        <Button
          onClick={() => openShareWindow(shareLinks.facebook)}
          variant="outline"
          className="justify-start"
          data-testid="share-facebook-button"
        >
          <Facebook className="w-4 h-4 mr-2" />
          Share on Facebook
        </Button>
        <Button
          onClick={() => openShareWindow(shareLinks.linkedin)}
          variant="outline"
          className="justify-start"
          data-testid="share-linkedin-button"
        >
          <Linkedin className="w-4 h-4 mr-2" />
          Share on LinkedIn
        </Button>
        <Button
          onClick={() => openShareWindow(shareLinks.whatsapp)}
          variant="outline"
          className="justify-start"
          data-testid="share-whatsapp-button"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Share on WhatsApp
        </Button>
        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="justify-start"
          data-testid="share-copy-button"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Link Copied!
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className} data-testid="share-dropdown">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => openShareWindow(shareLinks.twitter)}
          data-testid="share-dropdown-twitter"
        >
          <Twitter className="w-4 h-4 mr-2" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => openShareWindow(shareLinks.facebook)}
          data-testid="share-dropdown-facebook"
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => openShareWindow(shareLinks.linkedin)}
          data-testid="share-dropdown-linkedin"
        >
          <Linkedin className="w-4 h-4 mr-2" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => openShareWindow(shareLinks.whatsapp)}
          data-testid="share-dropdown-whatsapp"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => window.location.href = shareLinks.email}
          data-testid="share-dropdown-email"
        >
          <Mail className="w-4 h-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleCopyLink}
          data-testid="share-dropdown-copy"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Social meta tags component for head injection
export function SocialMetaTags({
  title,
  description,
  image,
  url,
  type = 'website',
  twitterHandle = '@YoForex'
}: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  twitterHandle?: string;
}) {
  const baseUrl = 'https://yoforex.net';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImage = image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : `${baseUrl}/og-image.svg`;

  return (
    <>
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="YoForex" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content={twitterHandle} />
      
      {/* Additional SEO Tags */}
      <link rel="canonical" href={fullUrl} />
    </>
  );
}