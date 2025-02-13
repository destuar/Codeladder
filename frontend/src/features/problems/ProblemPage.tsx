import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import InfoProblem from './components/InfoProblem';
import CodingProblem from './components/CodingProblem';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const navigate = useNavigate();
  
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
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      {problem.problemType === 'INFO' ? (
        <InfoProblem 
          content={problem.content}
          isCompleted={problem.isCompleted}
          nextProblemId={problem.nextProblemId}
          prevProblemId={problem.prevProblemId}
          estimatedTime={problem.estimatedTime}
        />
      ) : (
        <ErrorBoundary>
          <CodingProblem 
            title={problem.name}
            content={problem.content}
            codeTemplate={problem.codeTemplate}
            testCases={problem.testCases}
            difficulty={problem.difficulty}
            nextProblemId={problem.nextProblemId}
            prevProblemId={problem.prevProblemId}
            onNavigate={(id) => navigate(`/problems/${id}`)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default ProblemPage; 