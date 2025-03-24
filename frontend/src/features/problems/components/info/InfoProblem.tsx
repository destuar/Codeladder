import React from 'react';
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/features/admin/AdminContext';
import { isMarkdown } from '@/lib/markdown-to-html';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';
import { InfoHeader } from './InfoHeader';
import { formatEstimatedTime } from '../../utils/time';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from '@/components/ui/badge';

export interface InfoProblemProps {
  content: string;
  isCompleted?: boolean;
  nextProblemId?: string;
  nextProblemSlug?: string;
  prevProblemId?: string;
  prevProblemSlug?: string;
  problemId: string;
  estimatedTime?: number;
  isStandalone?: boolean;
  isReviewMode?: boolean;
  onCompleted?: () => void;
  title?: string;
  onNavigate: (id: string, slug?: string) => void;
  sourceContext?: {
    from: string;
    name: string;
    id: string;
  };
}

const InfoProblem: React.FC<InfoProblemProps> = ({ 
  content, 
  isCompleted = false,
  nextProblemId,
  nextProblemSlug,
  prevProblemId,
  prevProblemSlug,
  problemId,
  estimatedTime,
  isStandalone = false,
  isReviewMode = false,
  onCompleted,
  title = "Problem",
  onNavigate,
  sourceContext
}) => {
  const navigate = useNavigate();
  const { canAccessAdmin } = useAdmin();
  
  const { isProblemCompleted, handleMarkAsComplete } = useProblemCompletion(
    problemId, 
    isCompleted, 
    onCompleted,
    isReviewMode
  );

  const formattedTime = formatEstimatedTime(estimatedTime);

  const handleNavigate = (id: string, slug?: string) => {
    onNavigate(id, slug);
  };

  return (
    <div className="flex flex-col bg-background h-screen">
      <InfoHeader
        isCompleted={isProblemCompleted}
        onMarkComplete={handleMarkAsComplete}
        nextProblemId={nextProblemId}
        nextProblemSlug={nextProblemSlug}
        prevProblemId={prevProblemId}
        prevProblemSlug={prevProblemSlug}
        onNavigate={handleNavigate}
        title={title}
        sourceContext={sourceContext}
      />

      <div className="flex-1 overflow-auto px-4 md:px-8">
        <div className="py-4">
          {/* Reading time indicator */}
          {formattedTime && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Timer className="w-4 h-4" />
              <span>Reading Time: {formattedTime}</span>
            </div>
          )}

          {/* Main content */}
          <div className="max-w-4xl mx-auto overflow-hidden">
            {isMarkdown(content) ? (
              // For backward compatibility, use Markdown for existing markdown content
              <div className="prose dark:prose-invert max-w-full overflow-hidden">
                <Markdown 
                  content={content} 
                  className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
                />
              </div>
            ) : (
              // Use HtmlContent for HTML content
              <HtmlContent 
                content={content} 
                className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoProblem; 