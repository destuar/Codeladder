import React, { useState } from 'react';
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { ChevronRight, Timer, CheckCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAdmin } from '@/features/admin/AdminContext';

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

interface InfoProblemProps {
  content: string;
  isCompleted?: boolean;
  nextProblemId?: string;
  prevProblemId?: string;
  estimatedTime?: number;
  isStandalone?: boolean;
  problemId: string;
}

const InfoProblem: React.FC<InfoProblemProps> = ({ 
  content, 
  isCompleted = false,
  nextProblemId,
  prevProblemId,
  estimatedTime,
  isStandalone = false,
  problemId,
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { canAccessAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [isProblemCompleted, setIsProblemCompleted] = useState(isCompleted);

  const handleMarkAsComplete = async () => {
    // Optimistically update the UI
    setIsProblemCompleted(!isProblemCompleted);

    try {
      await api.post(`/problems/${problemId}/complete`, {}, token);
      // Invalidate queries to force a refresh of the data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['problem', problemId] }),
        queryClient.invalidateQueries({ queryKey: ['learningPath'] }),
        queryClient.invalidateQueries({ queryKey: ['topic'] }),
        queryClient.invalidateQueries({ queryKey: ['allProblems'] })
      ]);
    } catch (error) {
      // Revert the optimistic update on error
      setIsProblemCompleted(!isProblemCompleted);
      console.error('Error toggling problem completion:', error);
    }
  };

  const formattedTime = formatEstimatedTime(estimatedTime);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative">
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
          <div className="prose dark:prose-invert max-w-4xl mx-auto">
            <Markdown content={content} />
          </div>
        </div>
      </div>

      {/* Floating buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        {/* Complete button */}
        <Button 
          variant={isProblemCompleted ? "outline" : "default"}
          className={cn(
            "shadow-sm transition-all duration-200",
            isProblemCompleted && "border-green-500 text-green-500 hover:bg-green-500/10"
          )}
          onClick={handleMarkAsComplete}
          disabled={isProblemCompleted && !canAccessAdmin}
        >
          <div className="flex items-center">
            {isProblemCompleted ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span className="ml-2">{canAccessAdmin ? "Toggle Complete" : "Completed"}</span>
              </>
            ) : (
              <span>Mark as Complete</span>
            )}
          </div>
        </Button>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => prevProblemId && navigate(`/problems/${prevProblemId}`)}
            disabled={!prevProblemId}
            className="shadow-sm"
          >
            Previous
          </Button>
          <Button
            onClick={() => nextProblemId && navigate(`/problems/${nextProblemId}`)}
            disabled={!nextProblemId}
            className="shadow-sm"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InfoProblem; 