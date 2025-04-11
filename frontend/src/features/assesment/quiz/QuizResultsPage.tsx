import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock, 
  Award, 
  AlertCircle, 
  Bookmark,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { MultipleChoiceQuestion, CodeQuestion } from '../shared/components';
import { QuizQuestion } from './hooks/useQuiz';
import { CircleCheck, CircleX } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

type ResultQuestion = {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'CODE';
  text: string;
  correct: boolean;
  userAnswer: any;
  correctAnswer?: any;
  explanation?: string;
  // These are needed to make it compatible with QuizQuestion
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CODE';
  points: number;
  mcProblem?: {
    id: string;
    questionId: string;
    explanation?: string;
    shuffleOptions: boolean;
    options: {
      id: string;
      questionId: string;
      optionText: string;
      isCorrect: boolean;
      explanation?: string;
      orderNum?: number;
    }[];
  };
  codeProblem?: {
    id: string;
    questionId: string;
    initialCode: string;
    codeTemplate?: string;
    language: string;
    timeLimit: number;
    testCases: {
      id: string;
      input: string;
      expectedOutput: string;
      isHidden: boolean;
      passed: boolean;
      error?: string;
    }[];
  };
};

type QuizResult = {
  id: string;
  quizId: string;
  quiz: {
    id: string;
    title: string;
    description: string;
  };
  score: number;
  totalQuestions: number;
  percentageScore: number;
  timeSpentInSeconds: number;
  createdAt: string;
  questions: ResultQuestion[];
};

export function QuizResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    async function fetchResults() {
      if (!attemptId || !token) return;
      
      try {
        setLoading(true);
        
        // Add retry logic with delay to handle throttling
        let response = null;
        let retries = 3;
        
        while (retries > 0 && response === null) {
          console.log(`Attempting to fetch quiz results, attempt ${4-retries}/3`);
          response = await api.getQuizResults(attemptId, token);
          
          if (response === null) {
            console.log(`Response was null, retrying in 1 second...`);
            retries--;
            // Wait for a second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log('Quiz results response:', response);
        
        // If response is still null after retries, throw a meaningful error
        if (response === null || response === undefined) {
          throw new Error('Failed to fetch quiz results after multiple attempts');
        }
        
        // Ensure quiz object exists
        if (!response.quiz && response.quizId) {
          console.log(`No quiz object found in response, using quizTitle: ${response.quizTitle}`);
          
          // First check if we have a quizTitle property and use that
          if (response.quizTitle) {
            response.quiz = {
              id: response.quizId,
              title: response.quizTitle,
              description: response.quizDescription || ''
            };
            console.log('Created quiz object from response properties:', response.quiz);
          }
          // If no quizTitle, try to fetch quiz details
          else {
            console.log(`Fetching quiz details for ID: ${response.quizId}`);
            try {
              // Try to fetch the quiz details separately using the new function
              const quizDetails = await api.getAssessmentStructure(response.quizId, token, 'QUIZ');
              if (quizDetails) {
                response.quiz = {
                  id: quizDetails.id,
                  title: quizDetails.title || 'Quiz Results',
                  description: quizDetails.description || ''
                };
                console.log('Successfully fetched quiz details:', response.quiz);
              } else {
                throw new Error('Could not fetch quiz details');
              }
            } catch (detailsError) {
              console.error('Error fetching quiz details:', detailsError);
              // Create default quiz object as fallback
              response.quiz = {
                id: response.quizId || 'unknown',
                title: response.title || 'Quiz Results',
                description: response.description || ''
              };
              console.log('Created default quiz object:', response.quiz);
            }
          }
        } else if (!response.quiz) {
          console.log('No quiz ID found in response, creating default quiz object');
          response.quiz = {
            id: 'unknown',
            title: 'Quiz Results',
            description: ''
          };
        }
        
        // Check for questions in various possible properties
        let questionsArray = response.questions;
        
        if (!questionsArray && response.responses) {
          console.log('Using responses array instead of questions:', response.responses);
          questionsArray = response.responses;
        }
        
        if (!questionsArray && response.questionResponses) {
          console.log('Using questionResponses array instead of questions:', response.questionResponses);
          questionsArray = response.questionResponses;
        }
        
        // Transform the response to match our component interfaces
        if (questionsArray && Array.isArray(questionsArray)) {
          // First ensure we preserve any orderNum values
          const processedQuestions = questionsArray.map((q: any) => {
            console.log('Processing question:', q);
            return {
              ...q,
              id: q.id || q.questionId || `question-${Math.random().toString(36).substring(2, 15)}`,
              text: q.text || q.questionText || 'No question text',
              type: q.type || q.questionType || 'MULTIPLE_CHOICE',
              questionText: q.text || q.questionText || 'No question text',
              questionType: q.type || q.questionType || 'MULTIPLE_CHOICE',
              points: q.points || 0,
              correct: q.correct || q.isCorrect || false,
              userAnswer: q.userAnswer || q.response || '',
              // Preserve the orderNum value
              orderNum: q.orderNum !== undefined ? q.orderNum : null,
              mcProblem: q.mcProblem ? {
                ...q.mcProblem,
                questionId: q.id || q.questionId,
                shuffleOptions: false,
                options: (q.mcProblem.options || []).map((o: any) => ({
                  ...o,
                  questionId: q.id || q.questionId,
                  optionText: o.text || o.optionText || 'No option text'
                }))
              } : undefined,
              codeProblem: q.codeProblem ? {
                ...q.codeProblem,
                questionId: q.id || q.questionId,
                initialCode: q.codeProblem.initialCode || q.userAnswer || q.response || '',
                codeTemplate: q.codeProblem.initialCode || '',
                language: q.codeProblem.language || 'javascript',
                timeLimit: 0,
                testCases: q.codeProblem.testCases || []
              } : undefined
            };
          });
          
          // Sort questions by orderNum if available, falling back to the original order
          response.questions = processedQuestions
            .map((q, index) => ({ 
              ...q, 
              originalIndex: index, // Preserve original order as fallback
              orderNum: q.orderNum !== undefined && q.orderNum !== null ? q.orderNum : index
            }))
            .sort((a, b) => {
              // First try to sort by orderNum
              if (a.orderNum !== b.orderNum) {
                return a.orderNum - b.orderNum;
              }
              // Fall back to original order if orderNum is the same
              return a.originalIndex - b.originalIndex;
            })
            .map(({ originalIndex, ...q }) => q); // Remove the temporary property
        } else if (!response.questions) {
          // If there are no questions, set a default empty array
          console.warn('No questions found in the quiz results');
          response.questions = [];
        }
        
        // Ensure all required properties exist
        const defaultQuizResult: QuizResult = {
          id: response.id || attemptId || 'unknown',
          quizId: response.quizId || 'unknown',
          quiz: response.quiz || {
            id: 'unknown',
            title: 'Quiz Results',
            description: ''
          },
          score: response.score || 0,
          totalQuestions: response.totalQuestions || 
                          (response.questions ? response.questions.length : 0),
          percentageScore: response.percentageScore || 
                           response.percentage || 
                           (response.score && response.totalQuestions ? 
                             (response.score / response.totalQuestions) * 100 : 0),
          timeSpentInSeconds: response.timeSpentInSeconds || 
                              response.timeTaken || 
                              0,
          createdAt: response.createdAt || 
                     response.completedAt || 
                     new Date().toISOString(),
          questions: response.questions || []
        };
        
        // Use the processed response with defaults applied
        setResult(defaultQuizResult);
        setError(null);

        // Prefetch dashboard data after successfully loading results
        console.log("Prefetching learning path data...");
        await queryClient.prefetchQuery({
          queryKey: ['learningPath'],
          queryFn: async () => {
            if (!token) throw new Error('No token available for prefetch');
            return api.get('/learning/levels', token);
          },
          staleTime: 1000 * 30 // Consider data fresh for 30 seconds after prefetch
        });
        console.log("Learning path data prefetch initiated.");

      } catch (err) {
        console.error('Failed to fetch quiz results:', err);
        setError('Failed to load quiz results. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load quiz results',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchResults();
  }, [attemptId, toast, token, queryClient]);
  
  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Get score grade
  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  };
  
  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };
  
  // Handle errors
  if (error) {
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
                {error}
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>
    );
  }
  
  // Loading state
  if (loading || !result) {
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
  
  const handleRetakeQuiz = () => {
    if (result && result.quizId) {
      navigate(`/assessment/quiz/${result.quizId}`);
    }
  };

  const handleReturnToDashboard = () => {
    // Check if we have location state that indicates we came from quiz history
    const fromHistory = location.search?.includes('fromHistory=true') || 
                        new URLSearchParams(location.search).get('from') === 'history';
    
    if (fromHistory) {
      // If we have topicId in the query params, navigate to that specific history
      const topicId = new URLSearchParams(location.search).get('topicId');
      
      if (topicId) {
        navigate(`/quizzes/history/${topicId}`);
      } else {
        // If no topicId, go to topics page
        navigate('/topics');
      }
    } else {
      // Default behavior - return to dashboard
      navigate('/dashboard');
    }
  };
  
  return (
    <QuizLayout>
      <div className="py-6 container max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quiz Results</h1>
          <Button 
            onClick={handleReturnToDashboard}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {location.search?.includes('fromHistory=true') || 
             new URLSearchParams(location.search).get('from') === 'history' 
              ? 'Return to Quiz History' 
              : 'Return to Dashboard'}
          </Button>
        </div>
        
        {/* Quiz Summary */}
        <Card className="mb-8 shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle>{result.quiz?.title || 'Quiz Results'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score */}
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center">
                    <Trophy className="h-10 w-10 text-primary mb-2" />
                    <div className={`text-4xl font-bold ${getScoreColor(result.percentageScore || 0)}`}>
                      {result.percentageScore || 0}%
                    </div>
                    <div className="text-muted-foreground">
                      {getScoreGrade(result.percentageScore || 0)}
                    </div>
                    <div className="text-sm mt-2">
                      {result.score || 0} out of {result.totalQuestions || 0} correct
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Time */}
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center">
                    <Clock className="h-10 w-10 text-primary mb-2" />
                    <div className="text-2xl font-bold">
                      {formatTime(result.timeSpentInSeconds || 0)}
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
                      {new Date(result.createdAt || new Date()).toLocaleDateString()}
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
        
        {/* Quiz Questions */}
        <div className="space-y-8">
          {(result.questions || []).map((question, index) => (
            <Card key={question.id} className="shadow-md">
              <CardHeader className="pb-2 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <span>Question {index + 1}</span>
                    {question.correct ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                {/* Multiple Choice Questions */}
                {question.type === 'MULTIPLE_CHOICE' && question.mcProblem && (
                  <MultipleChoiceQuestion 
                    question={question as QuizQuestion}
                    selectedOption={question.userAnswer}
                    onSelectOption={() => {}}
                    isReview={true}
                  />
                )}
                
                {/* Fallback for multiple choice without mcProblem */}
                {question.type === 'MULTIPLE_CHOICE' && !question.mcProblem && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">
                      This multiple choice question could not be displayed properly. 
                      {question.userAnswer ? `Your answer was recorded.` : `No answer was recorded.`}
                    </p>
                  </div>
                )}
                
                {/* Code Questions */}
                {question.type === 'CODE' && question.codeProblem && (
                  <CodeQuestion
                    question={question as QuizQuestion}
                    code={question.userAnswer || ''}
                    onCodeChange={() => {}}
                    isReview={true}
                    testResults={question.codeProblem?.testCases?.map(tc => ({
                      passed: tc.passed,
                      input: tc.input,
                      expectedOutput: tc.expectedOutput,
                      error: tc.error
                    }))}
                  />
                )}
                
                {/* Fallback for code questions without codeProblem */}
                {question.type === 'CODE' && !question.codeProblem && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">
                      This code question could not be displayed properly.
                      {question.userAnswer ? 
                        <div className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-auto">
                          <pre>{question.userAnswer}</pre>
                        </div> 
                        : 
                        `No answer was recorded.`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </QuizLayout>
  );
}
