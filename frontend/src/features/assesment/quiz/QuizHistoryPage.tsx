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
  ChevronLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

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
        
        <Tabs defaultValue="all" className="mb-8" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Quizzes</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="best">Best Scores</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            {quizzes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-3">
                    <History className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Quiz Attempts Yet</h3>
                  <p className="text-muted-foreground mb-4">You haven't taken any quizzes for this topic yet.</p>
                  <Button
                    onClick={() => navigate(`/topic/${topic.slug || topic.id}`)}
                  >
                    Go to Topic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {quizzes.map((quiz: any) => {
                  const quizAttempts = attemptsByQuiz[quiz.id] || [];
                  const bestAttempt = getBestScore(quiz.id);
                  const sortedAttempts = [...quizAttempts].sort(
                    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                  );
                  
                  return (
                    <Card key={quiz.id} className="overflow-hidden">
                      <CardHeader className="bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle>{quiz.name}</CardTitle>
                            <CardDescription>{quiz.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">
                              Passing score: {quiz.passingScore}%
                            </div>
                            {bestAttempt && (
                              <Badge className={bestAttempt.passed ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                                Best score: {bestAttempt.score}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <h3 className="text-sm font-medium mb-3 flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                          Attempt History
                        </h3>
                        
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedAttempts.map((attempt: QuizAttempt) => (
                                <TableRow key={attempt.id}>
                                  <TableCell>
                                    {attempt.completedAt ? 
                                      formatDate(attempt.completedAt) : 
                                      <span className="text-muted-foreground">(In progress)</span>
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {attempt.score !== null ? 
                                      `${attempt.score}%` : 
                                      <span className="text-muted-foreground">-</span>
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {attempt.completedAt ? (
                                      attempt.passed ? (
                                        <div className="flex items-center text-green-600">
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Passed
                                        </div>
                                      ) : (
                                        <div className="flex items-center text-amber-600">
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Failed
                                        </div>
                                      )
                                    ) : (
                                      <span className="text-muted-foreground">Incomplete</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      {attempt.completedAt && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => navigate(`/quizzes/attempts/${attempt.id}/results`)}
                                        >
                                          View Results
                                        </Button>
                                      )}
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        onClick={() => navigate(`/quizzes/${quiz.id}`)}
                                      >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        {attempt.completedAt ? 'Retake' : 'Continue'}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 border-t flex justify-end py-3">
                        <Button 
                          onClick={() => navigate(`/quizzes/${quiz.id}`)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Take Quiz
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            {quizzes.filter(quiz => 
              (attemptsByQuiz[quiz.id] || []).some((a: QuizAttempt) => a.completedAt)
            ).length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-3">
                    <CheckCircle className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Completed Quizzes</h3>
                  <p className="text-muted-foreground mb-4">You haven't completed any quizzes for this topic yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {quizzes
                  .filter(quiz => (attemptsByQuiz[quiz.id] || []).some((a: QuizAttempt) => a.completedAt))
                  .map((quiz: any) => {
                    const completedAttempts = (attemptsByQuiz[quiz.id] || [])
                      .filter((a: QuizAttempt) => a.completedAt)
                      .sort((a: QuizAttempt, b: QuizAttempt) => 
                        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
                      );
                    
                    return (
                      <Card key={quiz.id}>
                        <CardHeader>
                          <CardTitle>{quiz.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {completedAttempts.map((attempt: QuizAttempt) => (
                                <TableRow key={attempt.id}>
                                  <TableCell>{formatDate(attempt.completedAt!)}</TableCell>
                                  <TableCell>{attempt.score}%</TableCell>
                                  <TableCell>
                                    {attempt.passed ? (
                                      <div className="flex items-center text-green-600">
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Passed
                                      </div>
                                    ) : (
                                      <div className="flex items-center text-amber-600">
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Failed
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => navigate(`/quizzes/attempts/${attempt.id}/results`)}
                                      >
                                        View Results
                                      </Button>
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        onClick={() => navigate(`/quizzes/${quiz.id}`)}
                                      >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Retake
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="best" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Best Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Best Score</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizzes.map((quiz: any) => {
                      const bestAttempt = getBestScore(quiz.id);
                      if (!bestAttempt) return null;
                      
                      return (
                        <TableRow key={quiz.id}>
                          <TableCell className="font-medium">{quiz.name}</TableCell>
                          <TableCell>
                            <div className={bestAttempt.passed ? "text-green-600" : "text-amber-600"}>
                              {bestAttempt.score}%
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(bestAttempt.completedAt!)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/quizzes/attempts/${bestAttempt.id}/results`)}
                              >
                                View Results
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => navigate(`/quizzes/${quiz.id}`)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retake
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </QuizLayout>
  );
} 