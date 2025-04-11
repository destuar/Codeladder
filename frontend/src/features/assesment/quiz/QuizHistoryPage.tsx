import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  History, 
  Trophy, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  RefreshCw, 
  ChevronLeft,
  Check,
  X,
  FileText,
  Medal,
  Star,
  Activity,
  Award,
  RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type QuizAttempt = {
  id: string;
  quizId: string;
  score: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  quiz: {
    id: string;
    name: string;
    description: string | null;
    passingScore: number;
  };
};

// Format time duration in minutes:seconds
const formatDuration = (durationInSeconds: number) => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Calculate time taken between two dates in seconds
const calculateTimeTaken = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end.getTime() - start.getTime()) / 1000);
};

export function QuizHistoryPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch topic details
  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      if (!token || !topicId) throw new Error('No token or topic ID');
      return api.get(`/learning/topics/${topicId}`, token);
    },
    enabled: !!token && !!topicId,
  });
  
  // Fetch quiz attempts for this topic
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['quizAttempts', topicId],
    queryFn: async () => {
      if (!token || !topicId) throw new Error('No token or topic ID');
      return api.getQuizAttemptsByTopic(topicId, token);
    },
    enabled: !!token && !!topicId,
  });
  
  // Group attempts by quiz
  const attemptsByQuiz = React.useMemo(() => {
    if (!attempts) return {};
    
    return attempts.reduce((acc: Record<string, QuizAttempt[]>, attempt: QuizAttempt) => {
      if (!acc[attempt.quizId]) {
        acc[attempt.quizId] = [];
      }
      acc[attempt.quizId].push(attempt);
      return acc;
    }, {});
  }, [attempts]);
  
  // Get unique quizzes
  const quizzes = React.useMemo(() => {
    if (!attempts) return [];
    
    const quizMap = new Map();
    attempts.forEach((attempt: QuizAttempt) => {
      if (!quizMap.has(attempt.quizId)) {
        quizMap.set(attempt.quizId, attempt.quiz);
      }
    });
    
    return Array.from(quizMap.values());
  }, [attempts]);
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Get best score for a quiz
  const getBestScore = (quizId: string) => {
    if (!attemptsByQuiz[quizId]) return null;
    
    const validAttempts = attemptsByQuiz[quizId].filter((a: QuizAttempt) => a.completedAt && a.score !== null);
    if (validAttempts.length === 0) return null;
    
    return validAttempts.reduce((best: QuizAttempt, current: QuizAttempt) => {
      return (current.score || 0) > (best.score || 0) ? current : best;
    }, validAttempts[0]);
  };
  
  // Handle loading state
  if (topicLoading || attemptsLoading) {
    return (
      <QuizLayout>
        <div className="container py-8 max-w-6xl">
          <div className="flex items-center mb-6">
            <Skeleton className="h-8 w-64" />
            <div className="ml-auto">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  // Handle no topic found
  if (!topic) {
    return (
      <QuizLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-destructive">Topic Not Found</h2>
              <p className="mt-2">The requested topic could not be loaded.</p>
              <Button 
                variant="outline" 
                className="mt-4"
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
  
  // Find the best attempt for each quiz
  const getBestAttempt = (quizAttempts: QuizAttempt[]) => {
    if (!quizAttempts || quizAttempts.length === 0) return null;
    
    return quizAttempts.reduce((best: QuizAttempt | null, current: QuizAttempt) => {
      // If there is no current best or this attempt has a higher score
      if (!best || ((current.score !== null && current.score !== undefined) && 
                   (best.score === null || best.score === undefined || current.score > best.score))) {
        return current;
      }
      return best;
    }, null);
  };
  
  // Count total attempts and passed attempts
  const getTotalStats = () => {
    if (!attempts) return { total: 0, passed: 0 };
    
    const total = attempts.length;
    const passed = attempts.filter((a: QuizAttempt) => a.passed).length;
    
    return { total, passed };
  };
  
  const stats = getTotalStats();
  
  return (
    <QuizLayout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center mb-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/topic/${topic.slug || topic.id}`)}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to {topic.name}
            </Button>
            <h1 className="text-2xl font-bold flex items-center">
              <History className="h-5 w-5 mr-2 text-blue-500" />
              Quiz History: {topic.name}
            </h1>
          </div>
        </div>

        <div className="mt-4">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <div className="bg-blue-50 p-4 rounded-full mb-3">
                  <History className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-muted-foreground">No quiz attempts recorded for this topic yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {quizzes.map((quiz) => {
                const quizAttempts = attemptsByQuiz[quiz.id] || [];
                const bestAttempt = getBestAttempt(quizAttempts);

                return (
                  <Card key={quiz.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 p-4 border-b">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 items-start">
                        <div>
                          <CardTitle className="text-xl flex items-center mb-1 sm:mb-0">
                            <FileText className="h-5 w-5 mr-2 text-primary" />
                            {quiz.name}
                            <Button 
                              variant="ghost"
                              className="ml-2 px-1.5 py-0.5 h-auto text-xs rounded-md hover:bg-accent hover:text-accent-foreground"
                              onClick={() => navigate(`/assessment/quiz/${quiz.id}`)}
                              title={`Retake ${quiz.name}`}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Retake
                            </Button>
                          </CardTitle>
                          {quiz.description && (
                            <CardDescription className="mt-1">{quiz.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex flex-col sm:items-end space-y-1 sm:space-y-0 flex-shrink-0">
                          {bestAttempt?.passed !== null && (
                            <Badge
                              variant={bestAttempt?.passed ? 'default' : 'destructive'}
                              className={cn(
                                "flex items-center px-2.5 py-1 text-xs font-medium",
                                bestAttempt?.passed && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700/50"
                              )}
                            >
                              {bestAttempt?.passed ? (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Highest: {bestAttempt?.score}% (Passed)
                                </>
                              ) : (
                                <>
                                  <X className="h-3.5 w-3.5 mr-1" /> Highest: {bestAttempt?.score}% (Failed)
                                </>
                              )}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            Passing Score: {quiz.passingScore}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {quizAttempts.length === 0 ? (
                        <p className="p-4 text-muted-foreground text-center">No attempts for this quiz.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Started</TableHead>
                              <TableHead>Completed</TableHead>
                              <TableHead>Time Taken</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quizAttempts.map((attempt: QuizAttempt) => (
                              <TableRow key={attempt.id}>
                                <TableCell>
                                  {attempt.completedAt ? (
                                    attempt.passed ? (
                                      <Badge
                                        variant="default"
                                        className="flex items-center w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700/50"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" /> Passed
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="flex items-center w-fit">
                                        <XCircle className="h-3 w-3 mr-1" /> Failed
                                      </Badge>
                                    )
                                  ) : (
                                    <Badge variant="secondary" className="flex items-center w-fit">
                                      <Activity className="h-3 w-3 mr-1" /> In Progress
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {attempt.score !== null ? `${attempt.score}%` : '-'}
                                </TableCell>
                                <TableCell>{formatDate(attempt.startedAt)}</TableCell>
                                <TableCell>
                                  {attempt.completedAt ? formatDate(attempt.completedAt) : 'In Progress'}
                                </TableCell>
                                <TableCell>
                                  {attempt.completedAt 
                                    ? formatDuration(calculateTimeTaken(attempt.startedAt, attempt.completedAt))
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {attempt.completedAt ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/assessment/results/${attempt.id}?type=quiz&fromHistory=true&topicId=${topicId}`)}
                                    >
                                      View Results
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/assessment/quiz/${attempt.quizId}?attemptId=${attempt.id}`)}
                                    >
                                      Continue Quiz
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </QuizLayout>
  );
} 