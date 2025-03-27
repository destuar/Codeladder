import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, BookOpen, Code2 } from 'lucide-react';
import { AssessmentQuestion } from '../types';

interface QuizSidebarProps {
  questions: AssessmentQuestion[];
  currentIndex: number;
  answers: Record<string, any>;
  submittedQuestionIds?: string[];
  onNavigate: (index: number) => void;
  onExit: () => void;
  elapsedTime?: number;
  quizTitle?: string;
}

export function QuizSidebar({
  questions,
  currentIndex,
  answers,
  submittedQuestionIds = [],
  onNavigate,
  onExit,
  elapsedTime = 0,
  quizTitle = 'Quiz'
}: QuizSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  };

  // Get question icon based on type
  const getQuestionIcon = (questionType?: string) => {
    if (questionType === 'MULTIPLE_CHOICE') {
      return <BookOpen className="h-3.5 w-3.5 text-amber-500" />;
    } else if (questionType === 'CODE') {
      return <Code2 className="h-3.5 w-3.5 text-indigo-500" />;
    }
    return null;
  };

  // Calculate completion percentage
  const completedCount = submittedQuestionIds.length;
  const totalQuestions = questions.length;
  const completionPercentage = Math.round((completedCount / totalQuestions) * 100);

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full z-10 transition-all duration-300 ease-in-out flex",
      isCollapsed ? "w-10" : "w-64"
    )}>
      {/* Collapse toggle button */}
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 z-20">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-background shadow-md border-muted"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar content */}
      <div className={cn(
        "h-full bg-card border-r flex flex-col transition-all duration-300",
        isCollapsed ? "w-10 overflow-hidden" : "w-64"
      )}>
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1">
              <h3 className="font-medium text-sm truncate">{quizTitle}</h3>
              <div className="text-xs text-muted-foreground flex items-center">
                <span className="mr-1">Time:</span>{formatTime(elapsedTime)} • {completionPercentage}% complete
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center text-xs font-medium">
                {currentIndex + 1}
              </div>
            </div>
          )}
        </div>

        {/* Questions list */}
        {!isCollapsed && (
          <ScrollArea className="flex-1">
            <div className="py-2">
              {questions.map((question, index) => {
                const isActive = index === currentIndex;
                const hasAnswer = !!answers[question.id];
                const isSubmitted = submittedQuestionIds.includes(question.id);

                return (
                  <button
                    key={question.id}
                    className={cn(
                      "w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors",
                      isActive ? "bg-muted/60" : "hover:bg-muted/30",
                      isSubmitted && !isActive ? "text-green-600" : hasAnswer && !isActive ? "text-primary" : "text-foreground"
                    )}
                    onClick={() => onNavigate(index)}
                  >
                    <div className="flex-shrink-0 w-6 flex justify-center">
                      {isSubmitted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : hasAnswer ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-medium">Q{index + 1}</span>
                      <span className="w-4">{getQuestionIcon(question.questionType)}</span>
                      <span className="text-xs truncate opacity-80">
                        {question.questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Code'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Question indicators for collapsed state */}
        {isCollapsed && (
          <div className="flex-1 py-2 flex flex-col items-center gap-1">
            {questions.map((question, index) => {
              const isActive = index === currentIndex;
              const hasAnswer = !!answers[question.id];
              const isSubmitted = submittedQuestionIds.includes(question.id);

              return (
                <button
                  key={question.id}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                    isActive ? "bg-primary text-primary-foreground" : "",
                    isSubmitted && !isActive ? "text-green-600" : hasAnswer && !isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  onClick={() => onNavigate(index)}
                  title={`Question ${index + 1}`}
                >
                  {isSubmitted && !isActive ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  ) : hasAnswer && !isActive ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Exit button */}
        <div className="p-3 border-t">
          <Button
            variant="outline"
            className={cn(
              "gap-2 justify-center",
              isCollapsed ? "w-full p-0 h-8" : "w-full"
            )}
            onClick={onExit}
          >
            <ChevronLeft className="h-4 w-4" />
            {!isCollapsed && <span>Back to Overview</span>}
          </Button>
        </div>
      </div>
    </div>
  );
} 