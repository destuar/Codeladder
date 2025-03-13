import { marked } from 'marked';

/**
 * Converts Markdown content to HTML
 * @param markdown The markdown content to convert
 * @returns The HTML representation of the markdown content
 */
export function markdownToHtml(markdown: string): string {
  // Set basic options for marked
  marked.use({
    gfm: true,
    breaks: true,
    pedantic: false
  });

  // Convert markdown to HTML - use marked.parse in synchronous mode
  let html: string;
  try {
    // In marked v15+, we need to use marked.parse in synchronous mode
    html = marked.parse(markdown, { async: false }) as string;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    // Fallback to a simple conversion if marked fails
    html = markdown
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\`(.*?)\`/g, '<code>$1</code>');
    html = `<p>${html}</p>`;
  }
  
  // Process the HTML to add classes and styling
  const processedHtml = html
    // Make sure code blocks have proper classes
    .replace(/<pre><code>/g, '<pre><code class="language-text">')
    // Add proper styling for horizontal rules
    .replace(/<hr>/g, '<hr class="border-t border-border my-8" />');
  
  return processedHtml;
}

/**
 * Utility function to check if content is likely Markdown or HTML
 * @param content The content to check
 * @returns True if the content is likely Markdown, false if it's likely HTML
 */
export function isMarkdown(content: string): boolean {
  if (!content) return true;
  
  // More comprehensive check for HTML content
  // If it has HTML tags with class attributes, it's definitely HTML
  const hasHtmlWithClasses = /<[a-z][^>]*class=/i.test(content);
  if (hasHtmlWithClasses) {
    return false;
  }
  
  // Simple heuristic: if it contains HTML tags, it's probably HTML
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
  
  // If it has markdown-specific patterns, it's probably markdown
  const hasMarkdownPatterns = /(\#{1,6}\s+.+)|(\*\*.*\*\*)|(\*.*\*)|(\[.*\]\(.*\))|(\`\`\`.+\`\`\`)|(\`.*\`)|(\-\s+.*)/i.test(content);
  
  // If it has HTML tags but no markdown patterns, it's probably HTML
  if (hasHtmlTags && !hasMarkdownPatterns) {
    return false;
  }
  
  // If it has markdown patterns, it's probably markdown
  if (hasMarkdownPatterns) {
    return true;
  }
  
  // If the content has multiple HTML tags, it's probably HTML
  const htmlTagCount = (content.match(/<[a-z][^>]*>/gi) || []).length;
  if (htmlTagCount > 3) {
    return false;
  }
  
  // Default to assuming it's markdown
  return true;
}

/**
 * Utility function to ensure content is HTML
 * @param content The content to convert
 * @returns HTML content
 */
export function ensureHtml(content: string): string {
  return isMarkdown(content) ? markdownToHtml(content) : content;
} 