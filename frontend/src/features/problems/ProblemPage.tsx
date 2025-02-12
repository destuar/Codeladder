import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import InfoProblem from './components/InfoProblem';
import CodingProblem from './components/CodingProblem';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Problem = {
  id: string;
  name: string;
  difficulty: 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
  content: string;
  problemType: 'INFO' | 'CODING';
  codeTemplate?: string;
  testCases?: string;
  nextProblemId?: string;
  prevProblemId?: string;
  isCompleted?: boolean;
  estimatedTime?: string;
};

const ProblemPage: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const { token } = useAuth();
  
  const { data: problem, isLoading, error } = useQuery<Problem>({
    queryKey: ['problem', problemId],
    queryFn: () => api.get(`/problems/${problemId}`, token),
    enabled: !!problemId && !!token,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="p-8 text-center text-destructive">
        Error loading problem
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      <div className="space-y-6">
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{problem.name}</h1>
                <p className="text-muted-foreground mt-2">
                  Difficulty: {problem.difficulty.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {problem.problemType === 'INFO' ? (
          <InfoProblem 
            content={problem.content}
            isCompleted={problem.isCompleted}
            nextProblemId={problem.nextProblemId}
            prevProblemId={problem.prevProblemId}
            estimatedTime={problem.estimatedTime}
          />
        ) : (
          <CodingProblem 
            content={problem.content}
            codeTemplate={problem.codeTemplate}
            testCases={problem.testCases}
          />
        )}
      </div>
    </div>
  );
};

export default ProblemPage; 