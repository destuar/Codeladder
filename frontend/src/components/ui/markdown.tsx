import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { CodeComponent } from 'react-markdown/lib/ast-to-react';
import type { ReactMarkdownOptions } from 'react-markdown/lib/react-markdown';
import { Link } from 'react-router-dom';

interface MarkdownProps {
  content: string;
  className?: string;
}

const CodeBlock: CodeComponent = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  
  return !inline ? (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      {...props}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

export function Markdown({ content, className = '' }: MarkdownProps) {
  const components: ReactMarkdownOptions['components'] = {
    code: CodeBlock,
    p: ({ children }) => <p className="mb-4">{children}</p>,
    h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4">
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => {
      // Check if it's an internal link
      if (href?.startsWith('/')) {
        return (
          <Link 
            to={href} 
            className="font-semibold text-primary hover:text-primary/80 hover:underline"
          >
            {children}
          </Link>
        );
      }
      // External link
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:text-primary/80 hover:underline"
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
} 
