import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../admin/AdminContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Topic, Problem } from '@/hooks/useLearningPath';
import { useAuth } from '@/features/auth/AuthContext';
import { Markdown } from '@/components/ui/markdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2 } from "lucide-react";

type Difficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';

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
  const { isAdminView } = useAdmin();
  const { token } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isTokenInitialized, setIsTokenInitialized] = useState(false);

  useEffect(() => {
    if (token) {
      console.log('Token initialized:', token.substring(0, 20) + '...');
      setIsTokenInitialized(true);
    } else {
      console.log('Waiting for token initialization...');
    }
  }, [token]);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!token || !isTokenInitialized) {
        console.log('Skipping fetch - Token ready:', !!token, 'Initialized:', isTokenInitialized);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching topic with ID:', topicId);
        console.log('Auth state - Token:', token.substring(0, 20) + '...', 'Initialized:', isTokenInitialized);
        const response = await api.get(`/learning/topics/${topicId}`, token);
        console.log('Topic API response:', response);
        if (!response) {
          throw new Error('No data received from API');
        }
        setTopic(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching topic:', err);
        setError('Failed to load topic data');
        setTopic(null);
      } finally {
        setLoading(false);
      }
    };

    // Only set loading true if we're actually going to fetch
    if (topicId && token && isTokenInitialized) {
      fetchTopic();
    }
  }, [topicId, token, isTokenInitialized]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedProblems = () => {
    if (!topic?.problems) return [];
    
    return [...topic.problems].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'difficulty':
          return direction * (DIFFICULTY_ORDER[a.difficulty as Difficulty] - DIFFICULTY_ORDER[b.difficulty as Difficulty]);
        case 'order':
          const aOrder = a.reqOrder || Infinity;
          const bOrder = b.reqOrder || Infinity;
          return direction * (aOrder - bOrder);
        case 'completed':
          return direction * (Number(a.completed) - Number(b.completed));
        default:
          return 0;
      }
    });
  };

  // Early return for loading state while waiting for token
  if (!token || !isTokenInitialized) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Initializing...</h2>
            <p className="mt-2">Setting up your session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <p className="mt-2">{error || 'The requested topic could not be loaded.'}</p>
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
    <div className="container py-8 space-y-6">
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
        <Card>
          <CardHeader>
            <CardTitle>Problems</CardTitle>
            <CardDescription>Practice problems for this topic</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors w-24" 
                    onClick={() => handleSort('order')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Order</span>
                      {sortField === 'order' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort('difficulty')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Difficulty</span>
                      {sortField === 'difficulty' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedProblems().map((problem) => (
                  <TableRow key={problem.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      {problem.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {problem.required ? (
                        <Badge variant="outline">REQ {problem.reqOrder}</Badge>
                      ) : (
                        <Badge variant="secondary">OPT {problem.reqOrder}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {problem.problemType === 'INFO' ? (
                          <Book className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        {problem.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DifficultyBadge difficulty={problem.difficulty as Difficulty} />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          console.log('Navigating to problem:', problem.id);
                          navigate(`/problems/${problem.id}`);
                        }}
                      >
                        Start
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 