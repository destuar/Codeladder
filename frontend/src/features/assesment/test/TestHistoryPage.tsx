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
  Award,
  RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from '@/lib/utils';

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

        <div className="mt-4">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <div className="bg-blue-50 p-4 rounded-full mb-3">
                  <History className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-muted-foreground">No test attempts recorded for this level yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {tests.map((test) => {
                const testAttempts = attemptsByTest[test.id] || [];
                const bestAttempt = getBestAttempt(testAttempts);

                return (
                  <Card key={test.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 p-4 border-b">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 items-start">
                        <div>
                          <CardTitle className="text-xl flex items-center mb-1 sm:mb-0">
                            <FileText className="h-5 w-5 mr-2 text-primary" />
                            {test.name}
                            <Button 
                              variant="ghost"
                              className="ml-2 px-1.5 py-0.5 h-auto text-xs rounded-md hover:bg-accent hover:text-accent-foreground"
                              onClick={() => navigate(`/assessment/test/${test.id}`)}
                              title={`Retake ${test.name}`}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Retake
                            </Button>
                          </CardTitle>
                          {test.description && (
                            <CardDescription className="mt-1">{test.description}</CardDescription>
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
                            Passing Score: {test.passingScore}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {testAttempts.length === 0 ? (
                        <p className="p-4 text-muted-foreground text-center">No attempts for this test.</p>
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
                            {testAttempts.map((attempt: TestAttempt) => (
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
                                      onClick={() => navigate(`/assessment/results/${attempt.id}?type=test&fromHistory=true&levelId=${levelId}`)}
                                    >
                                      View Results
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/assessment/test/${attempt.quizId}?attemptId=${attempt.id}`)}
                                    >
                                      Continue Test
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

export default TestHistoryPage; 