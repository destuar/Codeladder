import React from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface HtmlContentProps {
  content: string;
  className?: string;
}

/**
 * A component for rendering HTML content with Tailwind styling
 */
export function HtmlContent({ content, className = '' }: HtmlContentProps) {
  // Configure DOMPurify to allow certain attributes and tags
  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    // Allow target="_blank" and rel="noopener noreferrer" on links
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    
    // If this is a code block with a language class, preserve it
    if (node.tagName === 'CODE' && node.parentNode && 
        (node.parentNode as Element).tagName === 'PRE') {
      const match = (node.className || '').match(/language-(\w+)/);
      if (match) {
        node.className = `language-${match[1]} bg-muted p-4 block rounded-md overflow-x-auto`;
      }
    }
  });

  // Sanitize the HTML content
  const sanitizedHtml = DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe', 'video', 'audio', 'source'],
    ADD_ATTR: [
      'target', 'rel', 'frameborder', 'allowfullscreen', 'allow',
      'src', 'width', 'height', 'controls', 'autoplay', 'muted',
      'class', 'style' // Allow class and style attributes
    ],
  });

  // Check if the content already has Tailwind classes
  const hasExistingClasses = /<[a-z][^>]*class=/i.test(content);

  return (
    <div 
      className={cn(
        "html-content",
        // Only apply Tailwind classes if the content doesn't already have them
        !hasExistingClasses && [
          // Base text styling
          "text-foreground",
          // Heading styles
          "[&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mt-8 [&>h1]:mb-4",
          "[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-3",
          "[&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-2",
          "[&>h4]:text-lg [&>h4]:font-semibold [&>h4]:mt-3 [&>h4]:mb-2",
          "[&>h5]:font-semibold [&>h5]:mt-2 [&>h5]:mb-1",
          "[&>h6]:font-semibold [&>h6]:mt-2 [&>h6]:mb-1",
          // Paragraph styles
          "[&>p]:mb-4",
          // List styles
          "[&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4",
          "[&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4",
          "[&>li]:mb-1",
          // Blockquote styles
          "[&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4",
          // Link styles
          "[&>a]:font-semibold [&>a]:text-primary [&>a:hover]:text-primary/80 [&>a:hover]:underline",
          // Code styles
          "[&>code]:px-1 [&>code]:py-0.5 [&>code]:bg-muted [&>code]:rounded-md [&>code]:text-sm",
          "[&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:mb-4",
          "[&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>pre>code]:block",
          // Code block language-specific styling
          "[&>pre>code.language-javascript]:text-yellow-600 [&>pre>code.language-js]:text-yellow-600",
          "[&>pre>code.language-typescript]:text-blue-600 [&>pre>code.language-ts]:text-blue-600",
          "[&>pre>code.language-python]:text-green-600",
          "[&>pre>code.language-java]:text-orange-600",
          "[&>pre>code.language-csharp]:text-purple-600 [&>pre>code.language-cs]:text-purple-600",
          "[&>pre>code.language-html]:text-red-600",
          "[&>pre>code.language-css]:text-pink-600",
          "[&>pre>code.language-json]:text-green-600",
          // Table styles
          "[&>table]:w-full [&>table]:my-4 [&>table]:border-collapse",
          "[&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-border [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:bg-muted",
          "[&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-border [&>table>tbody>tr>td]:p-2",
          // Image styles
          "[&>img]:max-w-full [&>img]:rounded-md [&>img]:my-4",
          // Horizontal rule
          "[&>hr]:my-8 [&>hr]:border-t [&>hr]:border-border",
        ],
        // Always apply any additional classes
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
} 