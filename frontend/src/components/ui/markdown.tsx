import React, { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { Components, ExtraProps } from 'react-markdown';
import { Link } from 'react-router-dom';

interface MarkdownProps {
  content: string;
  className?: string;
}

type ComponentType<T> = React.ComponentType<T & ExtraProps>;

const CodeBlock: ComponentType<{ node?: any; inline?: boolean; className?: string; children?: ReactNode }> = ({
  inline,
  className,
  children,
  ...props
}) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  
  return !inline ? (
    <SyntaxHighlighter
      {...props}
      style={oneDark as any}
      language={language}
      PreTag="div"
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
  const components: Partial<Components> = {
    code: CodeBlock,
    p: ({ children, ...props }) => <p className="mb-4" {...props}>{children}</p>,
    h1: ({ children, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props}>{children}</h3>,
    ul: ({ children, ...props }) => <ul className="list-disc pl-6 mb-4" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="list-decimal pl-6 mb-4" {...props}>{children}</ol>,
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props}>
        {children}
      </blockquote>
    ),
    a: ({ href, children, ...props }) => {
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
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:text-primary/80 hover:underline"
          {...props}
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
