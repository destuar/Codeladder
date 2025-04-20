import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, XCircle, Clock, Trophy, Award, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MultipleChoiceQuestion, CodeQuestion } from '../shared/components';
import { AssessmentQuestion } from '../shared/types';

// Helper function for formatting duration - ** REPLACED with QuizResultsPage version **
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

// Adjust the QuizAttemptResponse interface to better match API shape
interface QuizAttemptResponse {
  id: string; 
  question: {
    id: string;
    questionText: string;
    questionType: 'MULTIPLE_CHOICE' | 'CODE';
    points?: number;
    mcProblem?: { 
      options: Array<{ id: string; optionText: string; isCorrect: boolean }>;
      explanation?: string;
    };
    codeProblem?: { 
      submittedCode?: string;
      feedback?: string;
    };
  };
  selectedOptionId?: string;
  isCorrect: boolean | null; // Can be null for unanswered questions
  score?: number;
  feedback?: string;
  submittedCode?: string; 
}

interface TestResult { // Represents the resolved data from useQuery
  id: string; // Attempt ID
  score: number;
  passingScore?: number; 
  startTime?: string; 
  completedAt?: string;
  quiz: { 
    id: string;
    name: string;
    passingScore: number;
    levelId?: string;
    level?: { name: string };
  };
  responses: QuizAttemptResponse[];
  userId?: string;
  elapsedTime?: number;
  totalQuestions?: number;
}

// Get score grade - matching quiz results page behavior
const getScoreGrade = (score: number) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Satisfactory';
  return 'Needs Improvement';
};

// Get score color - **MODIFIED** based on passing score
const getScoreColor = (score: number, passingScore: number) => {
  return score >= passingScore ? 'text-green-500' : 'text-red-500';
};

export function TestResultsPage() {
  // Hooks called unconditionally at the top
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient(); // Get query client instance
  
  const { data: attemptData, isLoading, error, isSuccess } = useQuery<TestResult, Error>({
    queryKey: ['testAttemptResult', attemptId],
    queryFn: async () => {
      if (!attemptId || !token) {
        throw new Error('Attempt ID or authentication token is missing');
      }
      console.log(`Fetching results for attempt ID: ${attemptId}`);
      return await api.getQuizAttempt(attemptId, token); 
    },
    enabled: !!attemptId && !!token, 
    staleTime: Infinity, 
  });

  const testResult = attemptData;

  // --- Prefetching logic --- 
  useEffect(() => {
    // Only prefetch if the main query was successful
    if (isSuccess && testResult) { 
      const prefetchLearningPath = async () => {
        console.log("Prefetching learning path data...");
        try {
          await queryClient.prefetchQuery({
            queryKey: ['learningPath'],
            queryFn: async () => {
              if (!token) throw new Error('No token available for prefetch');
              return api.api.get('/learning/levels', token);
            },
            staleTime: 1000 * 30 // Consider data fresh for 30 seconds
          });
          console.log("Learning path data prefetch initiated.");
        } catch (prefetchError) {
          console.error("Failed to prefetch learning path data:", prefetchError);
          // Don't block rendering, just log the error
        }
      };
      prefetchLearningPath();
    }
  }, [isSuccess, testResult, queryClient, token]); // Add dependencies
  // --- END Prefetching logic --- 

  // --- MOVED HOOK TO TOP --- 
  useEffect(() => {
    // Only clear storage if we successfully loaded the result
    if (testResult) { 
      const testId = testResult.quiz?.id;
      if (testId) {
        console.log(`Clearing session storage for test: ${testId}`);
        sessionStorage.removeItem(`test_${testId}`);
        sessionStorage.removeItem(`test_attempt_${testId}`);
        sessionStorage.setItem(`test_${testId}_completed`, 'true');
      }
    }
  }, [testResult]); // Dependency array remains the same
  // --- END MOVED HOOK --- 

  // Handle navigation
  const handleReturnToDashboard = () => {
    // Check if we have location state that indicates we came from test history
    const fromHistory = location.search?.includes('fromHistory=true') || 
                        new URLSearchParams(location.search).get('from') === 'history';
    
    if (fromHistory) {
      // If we have levelId in the query params, navigate to that specific history
      const levelId = new URLSearchParams(location.search).get('levelId');
      
      if (levelId) {
        navigate(`/tests/history/${levelId}`);
      } else {
        // If no levelId, go to levels page
        navigate('/levels');
      }
    } else {
      // Default behavior - return to dashboard
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <QuizLayout>
        <div className="py-6">
          <Skeleton className="h-12 w-[50%] mb-6" />
          <Skeleton className="h-[400px] w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  if (error || !testResult) {
    return (
      <QuizLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                There was a problem loading your test results. Please try again later or contact support.
              </p>
              {error && (
                <pre className="text-xs text-red-500 mt-4 p-2 bg-red-50 rounded">
                  {error?.message || "Test result data is unavailable."}
                </pre>
              )}
              <Button 
                onClick={handleReturnToDashboard}
                className="mt-4"
              >
                {location.search?.includes('fromHistory=true') || 
                 new URLSearchParams(location.search).get('from') === 'history' 
                  ? 'Return to Test History' 
                  : 'Return to Dashboard'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>
    );
  }
  
  // Safely access properties with proper defaults
  const totalQuestions = testResult?.totalQuestions || testResult?.responses?.length || 0;
  const correctAnswers = testResult?.responses?.filter((r: QuizAttemptResponse) => r.isCorrect === true).length || 0;
  const incorrectAnswers = testResult?.responses?.filter((r: QuizAttemptResponse) => r.isCorrect === false).length || 0;
  const unansweredQuestions = totalQuestions - correctAnswers - incorrectAnswers;
  const score = testResult?.score ?? 0; 
  const formattedScore = score.toFixed(0);
  
  const calculateElapsedTime = () => {
      if (testResult?.elapsedTime) return testResult.elapsedTime;
      if (testResult?.startTime && testResult?.completedAt) {
          const start = new Date(testResult.startTime).getTime();
          const end = new Date(testResult.completedAt).getTime();
          return Math.round((end - start) / 1000); 
      }
      return 0;
  };
  const elapsedTime = calculateElapsedTime();
  const formattedTime = formatTime(elapsedTime);
  
  const passingScore = testResult?.passingScore ?? testResult?.quiz?.passingScore ?? 70;
  const passed = score >= passingScore;
  
  // Calculate total possible points and earned points
  let totalPointsPossible = 0;
  let totalPointsEarned = 0;
  testResult?.responses?.forEach(response => {
    const questionPoints = response.question?.points || 1; // Default to 1 point if missing
    totalPointsPossible += questionPoints;
    // Use response.score if available, otherwise check correctness
    totalPointsEarned += response.score ?? (response.isCorrect ? questionPoints : 0);
  });
  
  // Log the processed values for debugging
  console.log('Processed test result values:', {
    score,
    formattedScore,
    totalQuestions,
    correctAnswers,
    elapsedTime,
    formattedTime,
    dates: {
      startTime: testResult?.startTime,
      completedAt: testResult?.completedAt
    },
    passed
  });
  
  return (
    <QuizLayout>
      <div className="py-6 container max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Test Results</h1>
          <Button 
            onClick={handleReturnToDashboard}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {location.search?.includes('fromHistory=true') || 
             new URLSearchParams(location.search).get('from') === 'history' 
              ? 'Return to Test History' 
              : 'Return to Dashboard'}
          </Button>
        </div>
        
        {/* Test Summary Card */}
        <Card className="mb-8 shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle>{testResult?.quiz?.name || 'Test Results'}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Apply 4-column grid layout like QuizResultsPage */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {/* Score */}
              <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg shadow-sm">
                <Trophy className="h-8 w-8 text-primary mb-2" />
                <div className={`text-3xl font-bold ${getScoreColor(score, passingScore)}`}>
                  {formattedScore}%
                </div>
                <div className="text-muted-foreground text-sm mt-1">
                  {getScoreGrade(score)}
                </div>
              </div>
              
              {/* Time Spent */}
              <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg shadow-sm">
                 <Clock className="h-8 w-8 text-primary mb-2" />
                 <div className="text-2xl font-bold">
                   {formattedTime}
                 </div>
                 <div className="text-muted-foreground text-sm mt-1">
                   Time Spent
                 </div>
              </div>
              
              {/* Points Earned */}
              <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg shadow-sm">
                 <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                 <div className="text-2xl font-bold">
                    {totalPointsEarned} / {totalPointsPossible}
                 </div>
                 <div className="text-muted-foreground text-sm mt-1">
                   Points Earned
                 </div>
              </div>
              
              {/* Date Completed */}
              <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg shadow-sm">
                 <Award className="h-8 w-8 text-primary mb-2" />
                 <div className="text-lg font-medium text-center">
                   {new Date(testResult?.completedAt || Date.now()).toLocaleDateString()}
                 </div>
                 <div className="text-muted-foreground text-sm mt-1">
                   Completed
                 </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Questions breakdown */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Questions Overview</h2>
          
          {testResult?.responses?.map((response, index) => {
            // Log the entire response object and the question part for inspection
            console.log(`[TestResultsPage] Rendering response ${index}:`, JSON.stringify(response, null, 2));
            console.log(`[TestResultsPage] Question data for index ${index}:`, JSON.stringify(response.question, null, 2));
            
            // Ensure question data exists
            if (!response.question) {
              return (
                <Card key={response.id} className="shadow-md">
                  <CardContent className="py-4 text-muted-foreground">
                    Question {index + 1} data is unavailable.
                  </CardContent>
                </Card>
              );
            }
            
            // Cast question data to the shared type for components
            const question = response.question as AssessmentQuestion;
            const pointsPossible = question.points || 1; // Default to 1 if points missing
            const pointsEarned = response.score ?? (response.isCorrect ? pointsPossible : 0); // Use response score or calculate based on correctness
            
            return (
              <Card key={response.id} className="shadow-md">
                <CardHeader className="pb-4 pt-4 border-b bg-muted/30 dark:bg-muted/10">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      {response.isCorrect === true ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : response.isCorrect === false ? (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      )}
                      <span>Question {index + 1}</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-sm font-medium">
                      {pointsEarned} / {pointsPossible} Points
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                  {question.questionType === 'MULTIPLE_CHOICE' && (
                    <MultipleChoiceQuestion 
                      question={question} 
                      selectedOption={response.selectedOptionId} 
                      isReview={true} 
                      onSelectOption={() => {}} 
                    />
                  )}
                  
                  {question.questionType === 'CODE' && (
                    <CodeQuestion
                      question={question}
                      code={response.submittedCode || ''} 
                      isReview={true}
                      onCodeChange={() => {}}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </QuizLayout>
  );
}
