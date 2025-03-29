import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Award
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type TestAttempt = {
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

export function TestHistoryPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  
  // Get level name from location state if available
  const levelName = location.state?.levelName || 'Level';
  
  // Fetch level details if needed (similar to topic details in QuizHistoryPage)
  const { data: level, isLoading: levelLoading } = useQuery({
    queryKey: ['level', levelId],
    queryFn: async () => {
      if (!token || !levelId) throw new Error('No token or level ID');
      const levels = await api.getLevels(token);
      const level = levels.find(l => l.id === levelId);
      if (!level) throw new Error(`Level with ID ${levelId} not found`);
      return level;
    },
    enabled: !!token && !!levelId,
  });
  
  // Fetch test attempts for this level
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['testAttempts', levelId],
    queryFn: async () => {
      if (!token || !levelId) throw new Error('No token or level ID');
      return api.getTestAttemptsForLevel(levelId, token);
    },
    enabled: !!token && !!levelId,
  });
  
  // Group attempts by test (similar to byQuiz grouping in QuizHistoryPage)
  const attemptsByTest = React.useMemo(() => {
    if (!attempts) return {};
    
    return attempts.reduce((acc: Record<string, TestAttempt[]>, attempt: TestAttempt) => {
      if (!acc[attempt.quizId]) {
        acc[attempt.quizId] = [];
      }
      acc[attempt.quizId].push(attempt);
      return acc;
    }, {});
  }, [attempts]);
  
  // Get unique tests
  const tests = React.useMemo(() => {
    if (!attempts) return [];
    
    const testMap = new Map();
    attempts.forEach((attempt: TestAttempt) => {
      if (!testMap.has(attempt.quizId)) {
        testMap.set(attempt.quizId, attempt.quiz);
      }
    });
    
    return Array.from(testMap.values());
  }, [attempts]);
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Get best score for a test
  const getBestScore = (testId: string) => {
    if (!attemptsByTest[testId]) return null;
    
    const validAttempts = attemptsByTest[testId].filter((a: TestAttempt) => a.completedAt && a.score !== null);
    if (validAttempts.length === 0) return null;
    
    return validAttempts.reduce((best: TestAttempt, current: TestAttempt) => {
      return (current.score || 0) > (best.score || 0) ? current : best;
    }, validAttempts[0]);
  };
  
  // Handle loading state
  if (levelLoading || attemptsLoading) {
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
  
  // Handle no level found
  if (!level) {
    return (
      <QuizLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-destructive">Level Not Found</h2>
              <p className="mt-2">The requested level could not be loaded.</p>
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
  
  // Find the best attempt for each test
  const getBestAttempt = (testAttempts: TestAttempt[]) => {
    if (!testAttempts || testAttempts.length === 0) return null;
    
    return testAttempts.reduce((best: TestAttempt | null, current: TestAttempt) => {
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
    const passed = attempts.filter((a: TestAttempt) => a.passed).length;
    
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
              onClick={() => navigate(`/dashboard`)}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold flex items-center">
              <History className="h-5 w-5 mr-2 text-blue-500" />
              Test History: {levelName}
            </h1>
          </div>
        </div>
        
        <Tabs defaultValue="all" className="mb-8" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Tests</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="best">Best Scores</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            {tests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-3">
                    <History className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Test Attempts Yet</h3>
                  <p className="text-muted-foreground mb-4">You haven't attempted any tests for this level yet.</p>
                  <Button onClick={() => navigate(`/levels/${levelId}`)}>
                    View Available Tests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {tests.map((test) => {
                  const testAttempts = attemptsByTest[test.id] || [];
                  const bestAttempt = getBestAttempt(testAttempts);
                  const sortedAttempts = [...testAttempts].sort(
                    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                  );
                  
                  return (
                    <Card key={test.id} className="overflow-hidden">
                      <CardHeader className="bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle>{test.name}</CardTitle>
                            <CardDescription>{test.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">
                              Passing score: {test.passingScore}%
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
                              {sortedAttempts.map((attempt: TestAttempt) => (
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
                                        onClick={() => navigate(`/assessment/quiz/${test.id}`)}
                                      >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Retry Test
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
                        {!bestAttempt && (
                          <Button 
                            variant="default" 
                            onClick={() => navigate(`/assessment/quiz/${test.id}`)}
                          >
                            Take Test
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            {tests.filter((test) => {
              const testAttempts = attemptsByTest[test.id] || [];
              return testAttempts.some((a: TestAttempt) => a.completedAt);
            }).length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-3">
                    <CheckCircle className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Completed Tests</h3>
                  <p className="text-muted-foreground mb-4">You haven't completed any tests for this level yet.</p>
                  <Button onClick={() => navigate(`/levels/${levelId}`)}>
                    View Available Tests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {tests
                  .filter((test) => {
                    const testAttempts = attemptsByTest[test.id] || [];
                    return testAttempts.some((a: TestAttempt) => a.completedAt);
                  })
                  .map((test) => {
                    const completedAttempts = (attemptsByTest[test.id] || [])
                      .filter((a: TestAttempt) => a.completedAt)
                      .sort((a: TestAttempt, b: TestAttempt) => 
                        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
                      );
                    
                    return (
                      <Card key={test.id}>
                        <CardHeader>
                          <CardTitle>{test.name}</CardTitle>
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
                              {completedAttempts.map((attempt: TestAttempt) => (
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
                                        onClick={() => navigate(`/assessment/quiz/${test.id}`)}
                                      >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Retry Test
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
            {tests.filter((test) => {
              const testAttempts = attemptsByTest[test.id] || [];
              return testAttempts.some((a: TestAttempt) => a.completedAt);
            }).length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-3">
                    <Trophy className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Best Scores Yet</h3>
                  <p className="text-muted-foreground mb-4">Complete some tests to see your best scores here.</p>
                  <Button onClick={() => navigate(`/levels/${levelId}`)}>
                    View Available Tests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Best Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Best Score</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tests
                        .filter((test) => {
                          const testAttempts = attemptsByTest[test.id] || [];
                          return testAttempts.some((a: TestAttempt) => a.completedAt);
                        })
                        .map((test) => {
                          const testAttempts = (attemptsByTest[test.id] || [])
                            .filter((a: TestAttempt) => a.completedAt);
                          const bestAttempt = getBestAttempt(testAttempts);
                          
                          if (!bestAttempt) return null;
                          
                          return (
                            <TableRow key={test.id}>
                              <TableCell className="font-medium">{test.name}</TableCell>
                              <TableCell>
                                <div className={bestAttempt.passed ? "text-green-600" : "text-amber-600"}>
                                  {bestAttempt.score}%
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(bestAttempt.completedAt || bestAttempt.startedAt)}</TableCell>
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
                                    onClick={() => navigate(`/assessment/quiz/${test.id}`)}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry Test
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </QuizLayout>
  );
}

export default TestHistoryPage; 