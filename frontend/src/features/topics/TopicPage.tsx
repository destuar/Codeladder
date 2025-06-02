import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../admin/AdminContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useMemo, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Topic, Problem, Level } from '@/hooks/useLearningPath';
import { useAuth } from '@/features/auth/AuthContext';
import { Markdown } from '@/components/ui/markdown';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2, Timer, Lock, AlertCircle, BookOpen, History, Settings, Loader2, ArrowLeft } from "lucide-react";
import { cn } from '@/lib/utils';
import { ProblemList } from '@/components/ProblemList';
import { useToast } from '@/components/ui/use-toast';
import { Difficulty, DIFFICULTY_ORDER } from '@/features/problems/types';
import { DifficultyBadge } from '@/features/problems/components/DifficultyBadge';
import { useMediaQuery } from "@/hooks/useMediaQuery";

type SortField = 'name' | 'difficulty' | 'order' | 'completed';
type SortDirection = 'asc' | 'desc';

function formatEstimatedTime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  
  // Input is already in minutes, no need to parse
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export default function TopicPage() {
  const { topicId, slug } = useParams<{ topicId?: string; slug?: string }>();
  const { isAdminView, canAccessAdmin } = useAdmin();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { data: topic, isLoading: loading, error } = useQuery<any>({
    queryKey: ['topic', topicId, slug],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      if (topicId) {
        return api.get(`/learning/topics/${topicId}`, token);
      } else if (slug) {
        return api.get(`/learning/topics/slug/${slug}`, token);
      }
      throw new Error('No topic ID or slug provided');
    },
    enabled: !!token && (!!topicId || !!slug) && window.location.pathname.includes('/topic/'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

  // Get learning path data to check if level is locked
  const { data: learningPath } = useQuery({
    queryKey: ['learningPath'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return api.getLevels(token);
    },
    enabled: !!token,
  });

  // Check if the current topic's level is locked based on cascading unlock logic
  const isLocked = (() => {
    // Need learningPath data and the current topic to determine lock status
    if (!learningPath || !topic || learningPath.length === 0) return false;

    // Find the index of the level containing the current topic
    const levelIndex = learningPath.findIndex((level: Level) => 
      level.topics.some((t: Topic) => t.id === topic.id || t.slug === topic.slug)
    );

    // If the topic/level isn't found, or it's the first level, it's not locked
    if (levelIndex < 0) return false; // Should not happen if topic exists
    if (levelIndex === 0) return false;
    
    // Find the index of the highest level where the user passed an exam
    let maxPassedIndex = -1;
    for (let i = learningPath.length - 1; i >= 0; i--) {
      if (learningPath[i].hasPassedExam === true) {
        maxPassedIndex = i;
        break; // Found the highest index
      }
    }
    
    // The current level (levelIndex) is unlocked if levelIndex <= maxPassedIndex + 1
    // Therefore, it is locked if levelIndex > maxPassedIndex + 1
    return levelIndex > maxPassedIndex + 1;
  })();

  // Transform problems to include isCompleted property
  const transformedProblems = useMemo(() => {
    if (!topic?.problems) return [];
    return topic.problems.map((problem: any) => ({
      ...problem,
      isCompleted: problem.completed, // Map 'completed' to 'isCompleted'
    }));
  }, [topic]);

  const handleProblemStart = (problemId: string, slug?: string) => {
    if (isLocked && !canAccessAdmin) {
      // Determine the name of the level whose exam needs to be passed
      let requiredExamLevelName = 'a previous level';
      if (learningPath && topic) {
        const currentLevelIndex = learningPath.findIndex((level: Level) => 
          level.topics.some((t: Topic) => t.id === topic.id || t.slug === topic.slug)
        );
        // The required exam is in the level *before* the first locked level
        if (currentLevelIndex > 0) {
            requiredExamLevelName = `Level ${learningPath[currentLevelIndex - 1].name}`;
        }
      }

      // Update warning message for the new logic
      setWarningMessage(`Pass the exam in ${requiredExamLevelName} to unlock this content.`);
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
      return;
    }

    // Add query parameters for context
    const params = topic ? new URLSearchParams({
      from: 'topic',
      name: topic.name,
      ...(topic.slug ? { slug: topic.slug } : { id: topic.id })
    }).toString() : '';

    if (slug) {
      navigate(`/problem/${slug}${params ? `?${params}` : ''}`);
    } else {
      navigate(`/problems/${problemId}${params ? `?${params}` : ''}`);
    }
  };

  // Handle clicking the "Take Quiz" button
  const handleTakeQuizClick = async () => {
    const currentSlug = slug || topic?.slug;
    if (!currentSlug || !token || isLocked) {

      if (isLocked) {
        setWarningMessage(`Pass the exam in the previous level to unlock this quiz.`); // Simplified message
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      }

      toast({
        title: "Cannot Start Quiz",
        description: isLocked ? "Level is locked." : "Missing topic information or authentication.",
        variant: "destructive",
      });
      return;
    }

    setIsTakingQuiz(true);
    try {
      // 1. Call the API to get the next quiz ID
      const result = await api.getNextQuizForTopic(currentSlug, token);

      // 2. Handle the response
      if (result.nextAssessmentId) {
        // 3. Navigate if ID exists
        navigate(`/assessment/quiz/${result.nextAssessmentId}`, {
          state: {
            topicId: topic?.id, // Pass context if available
            topicName: topic?.name,
            topicSlug: currentSlug,
          }
        });
      } else {
        // 4. Show message if no ID (e.g., all completed or none exist)
        toast({
          title: "Quiz Status",
          description: result.message || "No quizzes currently available for this topic.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error trying to start next quiz:", error);
      toast({
        title: "Error",
        description: `Failed to find the next quiz. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsTakingQuiz(false);
    }
  };

  // Process content to remove duplicate title and description if present
  const processedContent = useMemo(() => {
    if (!topic?.content) return '';
    
    // Remove title and description patterns from the content
    const content = topic.content;
    const titlePattern = new RegExp(`^# ?${topic.name}\\s*\n`, 'i');
    const descPattern = /^In this topic,.*?problems\.\s*\n/i;
    
    return content
      .replace(titlePattern, '')
      .replace(descPattern, '')
      .trim();
  }, [topic]);

  if (loading) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-destructive">Topic Not Found</h2>
            <p className="mt-2">{error instanceof Error ? error.message : 'The requested topic could not be loaded.'}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-5 sm:px-4 md:px-6 lg:px-8 pt-10 pb-8 space-y-2 relative">
      <div className="mb-0">
        <div className="flex items-center gap-3 mb-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-1 text-muted-foreground hover:text-foreground h-8 w-8"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {topic.name}
          </h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-transparent">
            {topic.level.name}
          </Badge>

          {/* Desktop Buttons: Take Quiz, Quiz History, Admin Edit */}
          <div className="ml-auto hidden md:flex items-center gap-2">
            <Button 
              onClick={handleTakeQuizClick}
              size="sm"
              variant="ghost"
              className="shadow-md hover:shadow-lg dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] border border-border/60 dark:border-[#5271FF]/15 text-foreground hover:bg-secondary/30 hover:text-foreground transition-all duration-300"
              disabled={isTakingQuiz || isLocked}
              title={isLocked ? "Complete previous level exam to unlock" : "Take the next available quiz"}
            >
              {isTakingQuiz ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
              )}
              {isTakingQuiz ? 'Finding...' : 'Take Quiz'}
            </Button>
            <Button 
              onClick={() => navigate(`/quizzes/history/${topicId || topic?.id}`)}
              size="sm"
              variant="ghost"
              className="shadow-md hover:shadow-lg dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] border border-border/60 dark:border-[#5271FF]/15 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all duration-300"
            >
              <History className="w-4 h-4 mr-2 text-amber-500" />
              Quiz History
            </Button>
            {isAdminView && (
              <Button 
                variant="ghost" 
                size="sm"
                className="border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2 text-green-500" />
                Edit Topic
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-0">
          {topic.description || 'In this topic, you will learn fundamental approaches to solving programming problems.'}
        </p>

        {/* Mobile Buttons: Take Quiz, Quiz History (Right Aligned) */}
        {!isDesktop && (
          <div className="flex justify-end items-center gap-2 mt-2">
            <Button 
              onClick={handleTakeQuizClick}
              size="sm"
              variant="ghost"
              className="shadow-md hover:shadow-lg dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] border border-border/60 dark:border-[#5271FF]/15 text-foreground hover:bg-secondary/30 hover:text-foreground transition-all duration-300"
              disabled={isTakingQuiz || isLocked}
              title={isLocked ? "Complete previous level exam to unlock" : "Take the next available quiz"}
            >
              {isTakingQuiz ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
              )}
              {isTakingQuiz ? 'Finding...' : 'Take Quiz'}
            </Button>
            <Button 
              onClick={() => navigate(`/quizzes/history/${topicId || topic?.id}`)}
              size="sm"
              variant="ghost"
              className="shadow-md hover:shadow-lg dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] border border-border/60 dark:border-[#5271FF]/15 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all duration-300"
            >
              <History className="w-4 h-4 mr-2 text-amber-500" />
              Quiz History
            </Button>
          </div>
        )}
      </div>

      {/* Warning message for locked content */}
      {showWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded flex items-center mt-4">
          <AlertCircle className="h-5 w-5 mr-2" />
          {warningMessage}
        </div>
      )}

      {/* Problems Section */}
      {transformedProblems && transformedProblems.length > 0 && (
        <div className={cn("mt-0", isLocked && "opacity-90")}>
          {isLocked && (
            <div className="flex justify-end mb-4">
              <div className="bg-background rounded-full p-2 shadow-sm border">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          )}
          
          <Card className={cn(
            "border-0 shadow-sm overflow-hidden",
            isLocked && "bg-muted/30 dark:bg-muted/10"
          )}>
            <CardContent className="p-0">
              <ProblemList
                problems={transformedProblems}
                isLocked={isLocked}
                canAccessAdmin={canAccessAdmin}
                onProblemStart={handleProblemStart}
                itemsPerPage={50}
                showOrder={isDesktop}
                hideHeader={true}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 