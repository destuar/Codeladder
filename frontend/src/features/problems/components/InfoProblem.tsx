import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

interface InfoProblemProps {
  content: string;
  isCompleted?: boolean;
  nextProblemId?: string;
  prevProblemId?: string;
  estimatedTime?: string;
}

const InfoProblem: React.FC<InfoProblemProps> = ({ 
  content, 
  isCompleted = false,
  nextProblemId,
  prevProblemId,
  estimatedTime = "5 min"
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        {/* Status indicator */}
        <div className={cn(
          "absolute top-0 right-0 w-20 h-20 transform translate-x-10 -translate-y-10 rotate-45",
          isCompleted ? "bg-green-500" : "bg-blue-500"
        )} />
        
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Reading Time: {estimatedTime}</span>
            </div>
            {isCompleted && (
              <div className="flex items-center space-x-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Completed</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="prose dark:prose-invert max-w-none p-6">
          <Markdown content={content} />
        </CardContent>

        <CardFooter className="flex justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={() => prevProblemId && navigate(`/problems/${prevProblemId}`)}
            disabled={!prevProblemId}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={() => nextProblemId && navigate(`/problems/${nextProblemId}`)}
            disabled={!nextProblemId}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InfoProblem; 