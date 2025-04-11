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

// Helper function for formatting duration since it's not available in utils
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} sec`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds 
      ? `${minutes} min ${remainingSeconds} sec` 
      : `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes || remainingSeconds
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
};

// Adjust the QuizAttemptResponse interface to better match API shape
interface QuizAttemptResponse {
  id: string; 
  question: {
    id: string;
    questionText: string;
    questionType: 'MULTIPLE_CHOICE' | 'CODE';
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
}

// Get score grade - matching quiz results page behavior
const getScoreGrade = (score: number) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Satisfactory';
  return 'Needs Improvement';
};

// Get score color - matching quiz results page behavior
const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
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
  const totalQuestions = testResult?.responses?.length || 0;
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
  const formattedTime = formatDuration(elapsedTime);
  
  const passingScore = testResult?.passingScore ?? testResult?.quiz?.passingScore ?? 70;
  const passed = score >= passingScore;
  
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score */}
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center">
                    <Trophy className="h-10 w-10 text-primary mb-2" />
                    <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                      {formattedScore}%
                    </div>
                    <div className="text-muted-foreground">
                      {getScoreGrade(score)}
                    </div>
                    <div className="text-sm mt-2">
                      {correctAnswers} out of {totalQuestions} correct
                    </div>
                    {passed && <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">Passed</Badge>}
                    {!passed && <Badge className="mt-2 bg-red-100 text-red-800 border-red-200">Failed</Badge>}
                  </div>
                </CardContent>
              </Card>
              
              {/* Time */}
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center">
                    <Clock className="h-10 w-10 text-primary mb-2" />
                    <div className="text-2xl font-bold">
                      {formattedTime}
                    </div>
                    <div className="text-muted-foreground">
                      Time Spent
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Date */}
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center">
                    <Award className="h-10 w-10 text-primary mb-2" />
                    <div className="text-lg font-medium text-center">
                      {new Date(testResult?.completedAt || Date.now()).toLocaleDateString()}
                    </div>
                    <div className="text-muted-foreground">
                      Completed
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {/* Questions breakdown */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Question Breakdown</h2>
          
          {testResult?.responses?.map((response, index) => {
            const question = response.question;
            const mcProblem = question?.mcProblem;
            const codeProblem = question?.codeProblem;
            
            if (!question) {
              return (
                <Card key={response.id} className="shadow-md">
                  <CardContent className="py-4 text-muted-foreground">
                    Question {index + 1} data is unavailable.
                  </CardContent>
                </Card>
              );
            }

            // Determine question state for styling
            const questionState = response.isCorrect === true 
              ? 'correct' 
              : response.isCorrect === false 
                ? 'incorrect' 
                : 'unanswered';

            return (
              <Card key={response.id} className="shadow-md">
                <CardHeader className="pb-2 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <span>Question {index + 1}</span>
                      {response.isCorrect === true ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="text-base font-medium">{question.questionText}</div>
                    
                    {/* Multiple Choice Display */}
                    {question.questionType === 'MULTIPLE_CHOICE' && mcProblem?.options && (
                      <div className="space-y-2">
                        {mcProblem.options.map((option) => {
                          const isSelected = option.id === response.selectedOptionId;
                          const isCorrect = option.isCorrect;
                          
                          return (
                            <div 
                              key={option.id}
                              className={`p-3 rounded-md text-sm border ${
                                isSelected && isCorrect
                                  ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                                : isSelected && !isCorrect
                                  ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
                                : isCorrect 
                                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1">{option.optionText}</div>
                                <div>
                                  {isCorrect && (
                                    <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
                                      Correct Answer
                                    </Badge>
                                  )}
                                  {isSelected && !isCorrect && (
                                    <Badge variant="outline" className="bg-red-100 border-red-300 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300">
                                      Your Answer
                                    </Badge>
                                  )}
                                  {isSelected && isCorrect && (
                                    <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
                                      Your Answer
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {mcProblem.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-900 text-sm">
                            <p className="font-medium mb-1">Explanation:</p>
                            <p>{mcProblem.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Code Display */}
                    {question.questionType === 'CODE' && (
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-[300px]">
                          <p className="text-xs text-muted-foreground mb-1">Your Submission:</p>
                          <pre className="text-sm whitespace-pre-wrap break-words"><code>{response.submittedCode || codeProblem?.submittedCode || 'No code submitted'}</code></pre>
                        </div>
                        {(response.feedback || codeProblem?.feedback) && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-900 text-sm">
                            <p className="font-medium mb-1">Feedback:</p>
                            <p>{response.feedback || codeProblem?.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Action Buttons - only when not from history */}
        {!(location.search?.includes('fromHistory=true') || 
           new URLSearchParams(location.search).get('from') === 'history') && (
          <div className="flex gap-4 mt-8 justify-center">
            {testResult?.quiz?.levelId && (
              <Button
                onClick={() => navigate(`/levels/${testResult.quiz.levelId}`)}
                variant="outline"
              >
                Return to Level
              </Button>
            )}
            
            {testResult?.quiz?.id && (
              <Button
                onClick={() => navigate(`/tests/${testResult.quiz.id}`)}
                variant="default"
              >
                Retake Test
              </Button>
            )}
          </div>
        )}
      </div>
    </QuizLayout>
  );
}
