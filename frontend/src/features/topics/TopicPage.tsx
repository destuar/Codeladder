import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../admin/AdminContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
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
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2, Timer, Lock, AlertCircle } from "lucide-react";
import { cn } from '@/lib/utils';
import { ProblemList } from '@/components/ProblemList';

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
  const { topicId } = useParams<{ topicId: string }>();
  const { isAdminView, canAccessAdmin } = useAdmin();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const { data: topic, isLoading: loading, error } = useQuery<Topic>({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return api.get(`/learning/topics/${topicId}`, token);
    },
    enabled: !!token && !!topicId,
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

  const handleProblemStart = (problemId: string) => {
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

    navigate(`/problems/${problemId}`);
  };

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
    <div className="container py-8 space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{topic.name}</h1>
          <p className="text-muted-foreground">Level {topic.level.order}</p>
        </div>
        {isAdminView && (
          <Button variant="outline">Edit Topic</Button>
        )}
      </div>

      <Card>
        {/* <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>{topic.description}</CardDescription>
        </CardHeader> */}
        <CardContent>
          <Markdown content={topic.content || ''} />
        </CardContent>
      </Card>

      {topic.problems && topic.problems.length > 0 && (
        <Card className={cn(isLocked && "bg-muted/50")}>
          <CardHeader className="relative">
            <CardTitle className={cn(isLocked && "text-muted-foreground")}>Problems</CardTitle>
            <CardDescription className={cn(isLocked && "text-muted-foreground/50")}>
              Practice problems for this topic
            </CardDescription>
            {isLocked && (
              <div className="absolute right-6 top-6">
                <div className="bg-background rounded-full p-2 shadow-sm border">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ProblemList
              problems={topic.problems}
              isLocked={isLocked}
              canAccessAdmin={canAccessAdmin}
              onProblemStart={handleProblemStart}
              itemsPerPage={50}
            />
          </CardContent>
        </Card>
      )}

      {/* Warning Card */}
      {showWarning && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">{warningMessage}</p>
                <p className="text-destructive/80 text-sm mt-1">Complete the required level to unlock this content.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 