import React, { useState, useEffect } from 'react';
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { Button } from "@/components/ui/button";
import { ChevronRight, Timer, CheckCircle, CheckCircle2, RepeatIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAdmin } from '@/features/admin/AdminContext';
import { ensureHtml, isMarkdown } from '@/lib/markdown-to-html';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';
import { ProblemHeader } from '@/features/problems/components/coding/ProblemHeader';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

function formatEstimatedTime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

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
  problemType?: string;
  onNavigate?: (id: string, slug?: string) => void;
  sourceContext?: {
    from: string;
    name: string;
    id: string;
  };
  title?: string;
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
  problemType = 'INFO',
  onNavigate,
  sourceContext,
  title = "Information"
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { canAccessAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const { 
    isProblemCompleted, 
    handleMarkAsComplete,
    showCompletionDialog,
    setShowCompletionDialog,
    isAddingToSpacedRepetition,
    handleConfirmCompletion 
  } = useProblemCompletion(
    problemId, 
    isCompleted, 
    onCompleted,
    isReviewMode,
    problemType
  );

  const formattedTime = formatEstimatedTime(estimatedTime);

  // Handle navigation to next or previous problem
  const handleNavigate = (id: string, slug?: string) => {
    if (onNavigate) {
      onNavigate(id, slug);
    } else {
      // Fallback to direct navigation if no navigation handler is provided
      if (slug) {
        navigate(`/problem/${slug}`);
      } else {
        navigate(`/problems/${id}`);
      }
    }
  };

  return (
    <div className={`${isReviewMode ? 'h-auto' : 'h-screen'} flex flex-col relative`}>
      {/* Problem Header - Same as in CodingProblem */}
      <ProblemHeader
        isCompleted={isProblemCompleted}
        onMarkComplete={handleMarkAsComplete}
        nextProblemId={nextProblemId}
        nextProblemSlug={nextProblemSlug}
        prevProblemId={prevProblemId}
        prevProblemSlug={prevProblemSlug}
        onNavigate={handleNavigate}
        title={title}
        isReviewMode={isReviewMode}
        sourceContext={sourceContext}
        problemType={problemType}
      />

      {/* Spaced Repetition Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Problem as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add this problem to your spaced repetition dashboard for future practice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleConfirmCompletion(false)}
              className="bg-primary"
            >
              Just Complete
            </AlertDialogAction>
            <Button 
              onClick={() => handleConfirmCompletion(true)}
              disabled={isAddingToSpacedRepetition}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isAddingToSpacedRepetition ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <RepeatIcon className="mr-2 h-4 w-4" />
                  Add to Spaced Repetition
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={`${isReviewMode ? 'flex-auto' : 'flex-1'} overflow-auto px-4 md:px-8`}>
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