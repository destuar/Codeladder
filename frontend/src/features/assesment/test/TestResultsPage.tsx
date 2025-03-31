import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
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

export function TestResultsPage() {
  // Hooks called unconditionally at the top
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = localStorage.getItem('token');
  
  const { data: attemptData, isLoading, error } = useQuery<TestResult, Error>({
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

  if (isLoading) {
    return (
      <QuizLayout>
        <div className="container max-w-4xl py-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-[300px]" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
            <Skeleton className="h-[300px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
            </div>
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  if (error || !testResult) {
    return (
      <QuizLayout>
        <div className="container max-w-4xl py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There was a problem loading your test results. Please try again later or contact support.
              </p>
              {error && (
                <pre className="text-xs text-red-500 mt-4 p-2 bg-red-50 rounded">
                  {error?.message || "Test result data is unavailable."}
                </pre>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </CardFooter>
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
      <div className="container max-w-4xl py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Test Results: {testResult?.quiz?.name || 'Assessment'} 
            </h1>
            <p className="text-muted-foreground">
              Completed on {new Date(testResult?.completedAt || Date.now()).toLocaleString()}
            </p>
          </div>
          
          {/* Result summary card */}
          <Card className="overflow-hidden">
            <div className={`py-3 px-6 ${passed ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
              <div className="flex items-center gap-2">
                {passed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                  {passed ? 'Passed' : 'Failed'} - Score: {formattedScore}% (Required: {passingScore}%)
                </span>
              </div>
            </div>
            
            <CardContent className="pt-6">
              {/* Progress bar for score */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Your Score</span>
                  <span className="font-semibold">{formattedScore}%</span>
                </div>
                <Progress 
                  value={score} 
                  className={`h-2 ${passed ? 'bg-muted text-green-500' : 'bg-muted text-amber-500'}`}
                />
              </div>
              
              {/* Questions summary - Restored 3-column layout */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950 rounded-md p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correctAnswers}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Correct</div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-950 rounded-md p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectAnswers}</div>
                  <div className="text-sm text-red-700 dark:text-red-300">Incorrect</div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{unansweredQuestions}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">Unanswered</div>
                </div>
              </div>
              
              {/* Time taken */}
              <div className="mt-6 flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time Taken: {formattedTime}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Questions breakdown */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Question Breakdown</h2>
            
            {testResult?.responses?.map((response, index) => {
              const question = response.question;
              const mcProblem = question?.mcProblem;
              const codeProblem = question?.codeProblem;
              
              if (!question) {
                return (
                  <Card key={response.id} className="overflow-hidden">
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
              
              // Get appropriate styling based on state
              const stateStyles = {
                correct: {
                  bg: 'bg-green-50 dark:bg-green-950',
                  text: 'text-green-700 dark:text-green-300',
                  icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
                },
                incorrect: {
                  bg: 'bg-red-50 dark:bg-red-950',
                  text: 'text-red-700 dark:text-red-300',
                  icon: <XCircle className="h-4 w-4 text-red-500" />
                },
                unanswered: {
                  bg: 'bg-gray-50 dark:bg-gray-900',
                  text: 'text-gray-700 dark:text-gray-300',
                  icon: <AlertCircle className="h-4 w-4 text-gray-500" />
                }
              };
              
              const { bg, text, icon } = stateStyles[questionState];

              return (
                <Card key={response.id} className="overflow-hidden">
                  <div className={`py-2 px-4 ${bg}`}>
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className={`text-sm ${text}`}>
                        Question {index + 1} - {
                          response.isCorrect === true 
                            ? 'Correct' 
                            : response.isCorrect === false 
                              ? 'Incorrect' 
                              : 'Unanswered'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <CardContent className="py-4">
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
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              Return to Dashboard
            </Button>
            
            {testResult?.quiz?.id && (
              <Button
                onClick={() => navigate(`/tests/${testResult.quiz.id}`)}
                variant="outline"
                className="flex-1"
              >
                View Test Details
              </Button>
            )}
            
            {testResult?.quiz?.levelId && (
              <Button
                onClick={() => navigate(`/levels/${testResult.quiz.levelId}`)}
                variant="default"
                className="flex-1"
              >
                Return to Level
              </Button>
            )}
          </div>
        </div>
      </div>
    </QuizLayout>
  );
}
