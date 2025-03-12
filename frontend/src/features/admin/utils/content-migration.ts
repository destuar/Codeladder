import { markdownToHtml, isMarkdown } from '@/lib/markdown-to-html';

/**
 * Converts Markdown content to HTML for use in the admin interface
 * This is useful when editing existing content that was originally in Markdown
 * 
 * @param content The content to convert (can be Markdown or HTML)
 * @returns HTML content
 */
export function convertToHtml(content: string): string {
  if (!content) return '';
  
  // If it's already HTML, return it as is
  if (!isMarkdown(content)) {
    return content;
  }
  
  // Convert Markdown to HTML
  return markdownToHtml(content);
}

/**
 * Helper function to add classes to an HTML tag while preserving existing classes
 * @param match The matched HTML tag
 * @param tagAttributes The existing attributes of the tag
 * @param classesToAdd The classes to add
 * @returns The HTML tag with the added classes
 */
function addClassesToTag(match: string, tagAttributes: string, classesToAdd: string): string {
  // Check if the tag already has a class attribute
  const classMatch = tagAttributes.match(/class\s*=\s*["']([^"']*)["']/i);
  
  if (classMatch) {
    // If it has a class attribute, append the new classes
    const existingClasses = classMatch[1];
    const updatedClasses = existingClasses ? `${existingClasses} ${classesToAdd}` : classesToAdd;
    return match.replace(
      /class\s*=\s*["']([^"']*)["']/i, 
      `class="${updatedClasses}"`
    );
  } else {
    // If it doesn't have a class attribute, add one
    return match.replace('>', ` class="${classesToAdd}">`);
  }
}

/**
 * Helper function to add inline styles to an HTML tag
 * @param match The matched HTML tag
 * @param tagAttributes The existing attributes of the tag
 * @param stylesToAdd The styles to add as an object
 * @returns The HTML tag with the added styles
 */
function addStylesToTag(match: string, tagAttributes: string, stylesToAdd: Record<string, string>): string {
  // Convert styles object to string
  const styleString = Object.entries(stylesToAdd)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
  
  // Check if the tag already has a style attribute
  const styleMatch = tagAttributes.match(/style\s*=\s*["']([^"']*)["']/i);
  
  if (styleMatch) {
    // If it has a style attribute, append the new styles
    const existingStyles = styleMatch[1];
    const updatedStyles = existingStyles ? `${existingStyles}; ${styleString}` : styleString;
    return match.replace(
      /style\s*=\s*["']([^"']*)["']/i, 
      `style="${updatedStyles}"`
    );
  } else {
    // If it doesn't have a style attribute, add one
    return match.replace('>', ` style="${styleString}">`);
  }
}

/**
 * Adds Tailwind classes to HTML elements in the content
 * This is useful when converting existing content to use Tailwind
 * Uses string replacement instead of DOM manipulation for better compatibility
 * Preserves existing classes when adding new ones
 * 
 * @param htmlContent The HTML content to enhance with Tailwind classes
 * @returns HTML content with Tailwind classes
 */
export function enhanceWithTailwind(htmlContent: string): string {
  if (!htmlContent) return '';
  
  let processedHtml = htmlContent;
  
  // Add Tailwind classes to headings while preserving existing classes
  processedHtml = processedHtml
    .replace(/<h1([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "text-3xl font-bold mt-8 mb-4"))
    .replace(/<h2([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "text-2xl font-bold mt-6 mb-3"))
    .replace(/<h3([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "text-xl font-semibold mt-4 mb-2"))
    .replace(/<h4([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "text-lg font-semibold mt-3 mb-2"))
    .replace(/<h5([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "font-semibold mt-2 mb-1"))
    .replace(/<h6([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "font-semibold mt-2 mb-1"));
  
  // Add Tailwind classes to paragraphs
  processedHtml = processedHtml.replace(/<p([^>]*)>/g, (match, attrs) => 
    addClassesToTag(match, attrs, "mb-4"));
  
  // Add Tailwind classes to lists
  processedHtml = processedHtml
    .replace(/<ul([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "list-disc pl-6 mb-4"))
    .replace(/<ol([^>]*)>/g, (match, attrs) => 
      addClassesToTag(match, attrs, "list-decimal pl-6 mb-4"));
  
  // Add Tailwind classes to blockquotes
  processedHtml = processedHtml.replace(
    /<blockquote([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "border-l-4 border-primary pl-4 italic my-4")
  );
  
  // Add Tailwind classes to links
  processedHtml = processedHtml.replace(
    /<a([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "font-semibold text-primary hover:text-primary/80 hover:underline")
  );
  
  // Add Tailwind classes to inline code (not in pre blocks)
  processedHtml = processedHtml.replace(
    /<code(?![^>]*class=)([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "px-1 py-0.5 bg-muted rounded-md text-sm whitespace-pre-wrap break-words")
  );
  
  // Add Tailwind classes to pre blocks with improved wrapping
  processedHtml = processedHtml.replace(
    /<pre([^>]*)>/g, 
    (match, attrs) => {
      const withClasses = addClassesToTag(match, attrs, "bg-muted p-4 rounded-md overflow-x-auto mb-4 max-w-full whitespace-pre-wrap break-words");
      return addStylesToTag(withClasses, attrs, {
        'white-space': 'pre-wrap',
        'word-break': 'break-word',
        'overflow-wrap': 'break-word',
        'max-width': '100%'
      });
    }
  );
  
  // Add Tailwind classes to code blocks inside pre with improved wrapping
  processedHtml = processedHtml.replace(
    /<pre[^>]*><code([^>]*)>/g,
    (match, attrs) => {
      const codeWithClasses = addClassesToTag(`<code${attrs}>`, attrs, "bg-transparent p-0 block whitespace-pre-wrap break-words");
      const codeWithStyles = addStylesToTag(codeWithClasses, attrs, {
        'white-space': 'pre-wrap',
        'word-break': 'break-word',
        'overflow-wrap': 'break-word'
      });
      return match.replace(/<code[^>]*>/, codeWithStyles);
    }
  );
  
  // Add Tailwind classes to tables
  processedHtml = processedHtml.replace(
    /<table([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "w-full my-4 border-collapse")
  );
  
  // Add Tailwind classes to table headers
  processedHtml = processedHtml.replace(
    /<th([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "border border-border p-2 bg-muted")
  );
  
  // Add Tailwind classes to table cells
  processedHtml = processedHtml.replace(
    /<td([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "border border-border p-2")
  );
  
  // Add Tailwind classes to images
  processedHtml = processedHtml.replace(
    /<img([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "max-w-full rounded-md my-4")
  );
  
  // Add Tailwind classes to horizontal rules
  processedHtml = processedHtml.replace(
    /<hr([^>]*)>/g, 
    (match, attrs) => addClassesToTag(match, attrs, "my-8 border-t border-border")
  );
  
  return processedHtml;
}

/**
 * Converts Markdown content to HTML with Tailwind classes
 * This is a convenience function that combines convertToHtml and enhanceWithTailwind
 * 
 * @param content The content to convert (can be Markdown or HTML)
 * @returns HTML content with Tailwind classes
 */
export function convertToTailwindHtml(content: string): string {
  const html = convertToHtml(content);
  return enhanceWithTailwind(html);
} 