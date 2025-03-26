import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../admin/AdminContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useMemo } from 'react';
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
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2, Timer, Lock, AlertCircle, BookOpen, History } from "lucide-react";
import { cn } from '@/lib/utils';
import { ProblemList } from '@/components/ProblemList';
import { useToast } from '@/components/ui/use-toast';

type Difficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';

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

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  'EASY_IIII': 1,
  'EASY_III': 2,
  'EASY_II': 3,
  'EASY_I': 4,
  'MEDIUM': 5,
  'HARD': 6
};

type SortField = 'name' | 'difficulty' | 'order' | 'completed';
type SortDirection = 'asc' | 'desc';

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const getColor = () => {
    switch (difficulty) {
      case 'EASY_IIII':
      case 'EASY_III':
      case 'EASY_II':
      case 'EASY_I':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColor()}`}>
      {difficulty.replace(/_/g, ' ')}
    </span>
  );
}

export default function TopicPage() {
  const { topicId, slug } = useParams<{ topicId?: string; slug?: string }>();
  const { isAdminView, canAccessAdmin } = useAdmin();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const { data: topic, isLoading: loading, error } = useQuery<Topic>({
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
    enabled: !!token && (!!topicId || !!slug),
  });

  // Get learning path data to check if level is locked
  const { data: learningPath } = useQuery({
    queryKey: ['learningPath'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return api.get('/learning/levels', token);
    },
    enabled: !!token,
  });

  // Query to get the next available quiz for this topic
  const { data: nextQuiz, isLoading: quizLoading } = useQuery({
    queryKey: ['nextQuiz', topicId, slug],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      
      try {
        // Always use the slug-based API
        if (slug) {
          return api.getNextAvailableQuizBySlug(slug, token);
        } else if (topic?.slug) {
          // If we have the topic data but were given an ID instead of slug
          return api.getNextAvailableQuizBySlug(topic.slug, token);
        }
        throw new Error('No topic slug available');
      } catch (error) {
        console.error('Error fetching next quiz:', error);
        return null;
      }
    },
    // Enable only when we have the slug (either directly or from the topic)
    enabled: !!token && (!!slug || (!!topic?.slug)),
  });

  // Check if the current topic's level is locked
  const isLocked = (() => {
    if (!learningPath || !topic) return false;

    const currentLevel = learningPath.find((level: Level) => 
      level.topics.some((t: Topic) => t.id === topicId)
    );
    if (!currentLevel) return false;

    const levelIndex = learningPath.findIndex((l: Level) => l.id === currentLevel.id);
    if (levelIndex === 0) return false;

    // Check if all previous levels are completed
    for (let i = 0; i < levelIndex; i++) {
      const level = learningPath[i];
      const isLevelCompleted = level.topics.every((topic: Topic) => {
        const requiredProblems = topic.problems.filter((p: Problem) => p.required);
        if (requiredProblems.length === 0) return true;
        const completedRequired = requiredProblems.filter((p: Problem) => p.completed).length;
        return completedRequired === requiredProblems.length;
      });
      if (!isLevelCompleted) return true;
    }

    return false;
  })();

  const handleProblemStart = (problemId: string, slug?: string) => {
    if (isLocked && !canAccessAdmin) {
      const uncompletedLevel = learningPath?.find((level: Level, index: number) => {
        if (index === 0) return false;
        return !level.topics.every((topic: Topic) => {
          const requiredProblems = topic.problems.filter((p: Problem) => p.required);
          if (requiredProblems.length === 0) return true;
          const completedRequired = requiredProblems.filter((p: Problem) => p.completed).length;
          return completedRequired === requiredProblems.length;
        });
      });

      if (uncompletedLevel) {
        setWarningMessage(`You must complete Level ${uncompletedLevel.name} before continuing.`);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
        return;
      }
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

  // Handle starting a quiz
  const handleStartQuiz = async () => {
    if (isLocked && !canAccessAdmin) {
      const uncompletedLevel = learningPath?.find((level: Level, index: number) => {
        if (index === 0) return false;
        return !level.topics.every((topic: Topic) => {
          const requiredProblems = topic.problems.filter((p: Problem) => p.required);
          if (requiredProblems.length === 0) return true;
          const completedRequired = requiredProblems.filter((p: Problem) => p.completed).length;
          return completedRequired === requiredProblems.length;
        });
      });

      if (uncompletedLevel) {
        setWarningMessage(`You must complete Level ${uncompletedLevel.name} before continuing.`);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
        return;
      }
    }

    if (!nextQuiz) {
      toast({
        title: "No Quiz Available",
        description: "There are no quizzes available for this topic at the moment.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/quizzes/${nextQuiz.id}`);
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
    <div className="container pt-10 pb-8 space-y-2 relative">
      <div className="mb-0">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
            {topic.name}
          </h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {topic.level.name}
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            <Button 
              onClick={handleStartQuiz} 
              size="sm"
              variant="default"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              disabled={quizLoading || isLocked || !nextQuiz}
              title={!nextQuiz ? "No quiz available for this topic" : ""}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {quizLoading ? 'Loading...' : 'Take Quiz'}
            </Button>
            <Button 
              onClick={() => navigate(`/quizzes/history/${topicId || topic?.id}`)}
              size="sm"
              variant="outline"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <History className="w-4 h-4 mr-2" />
              Quiz History
            </Button>
            {isAdminView && (
              <Button variant="outline" size="sm">Edit Topic</Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground ml-3 mb-0">
          {topic.description || 'In this topic, you will learn fundamental approaches to solving programming problems.'}
        </p>
      </div>

      {/* Warning message for locked content */}
      {showWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded flex items-center mt-4">
          <AlertCircle className="h-5 w-5 mr-2" />
          {warningMessage}
        </div>
      )}

      {/* Problems Section */}
      {topic.problems && topic.problems.length > 0 && (
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
                problems={topic.problems}
                isLocked={isLocked}
                canAccessAdmin={canAccessAdmin}
                onProblemStart={handleProblemStart}
                itemsPerPage={50}
                showOrder={true}
                hideHeader={true}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 