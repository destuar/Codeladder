import React from 'react';
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { ChevronRight, Timer, CheckCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

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
}

const InfoProblem: React.FC<InfoProblemProps> = ({ 
  content, 
  isCompleted = false,
  nextProblemId,
  prevProblemId,
  estimatedTime,
  isStandalone = false
}) => {
  const navigate = useNavigate();
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
        {isCompleted ? (
          <div className="flex items-center justify-end text-green-500 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg shadow-sm">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium ml-2">Completed</span>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="shadow-sm"
            onClick={() => {
              // TODO: Handle completion
            }}
          >
            Mark as Complete
          </Button>
        )}

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