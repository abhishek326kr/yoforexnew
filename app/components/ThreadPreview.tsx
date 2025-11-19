"use client";

import { useMemo, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";

interface ThreadPreviewProps {
  title: string;
  body: string;
}

// Configure DOMPurify with strict security settings
const configureDOMPurify = () => {
  // Hook to remove ALL event handler attributes (on*) dynamically
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const attrName = data.attrName.toLowerCase();
    
    // Block all attributes starting with "on" (event handlers)
    if (attrName.startsWith('on')) {
      data.forceKeepAttr = false;
      data.keepAttr = false;
      return;
    }
    
    // Block style attribute
    if (attrName === 'style') {
      data.forceKeepAttr = false;
      data.keepAttr = false;
      return;
    }
  });

  // Hook to enforce safe URIs after sanitization with case-insensitive checking
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Enforce safe protocols for links
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      const href = (node.getAttribute('href') || '').toLowerCase();
      // Only allow https, http, mailto, tel, and relative URLs
      if (!/^(?:https?|mailto|tel):\/\/|^\//.test(href) && !/^#/.test(href)) {
        node.removeAttribute('href');
      }
    }
    
    // Enforce safe protocols for images
    if (node.tagName === 'IMG' && node.hasAttribute('src')) {
      const src = (node.getAttribute('src') || '').toLowerCase();
      // Only allow https, http, and relative URLs for images
      if (!/^(?:https?):\/\/|^\//.test(src)) {
        node.removeAttribute('src');
      }
    }
  });
};

export default function ThreadPreview({ title, body }: ThreadPreviewProps) {
  useEffect(() => {
    configureDOMPurify();
  }, []);

  const sanitizedBody = useMemo(() => {
    if (!body) {
      return "<p class='text-muted-foreground italic'>Your content will appear here...</p>";
    }
    
    // Sanitize HTML with comprehensive XSS protection
    // Note: Event handlers and style are blocked via hooks, not here
    return DOMPurify.sanitize(body, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
      SAFE_FOR_TEMPLATES: true,
      // Forbid dangerous tags including SVG and MathML
      FORBID_TAGS: [
        'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
        'button', 'select', 'option', 'svg', 'math', 'style', 'link', 'base',
        'meta', 'noscript', 'applet', 'canvas', 'audio', 'video', 'track',
        'source',
      ],
    });
  }, [body]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" data-testid="preview-title">
            {title || "Untitled Thread"}
          </h1>
          <p className="text-sm text-muted-foreground">Preview of your thread</p>
        </div>

        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          data-testid="preview-body"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
      </div>
    </div>
  );
}
