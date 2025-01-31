import { useParams } from 'react-router-dom';
import { useAdmin } from '../admin/AdminContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Topic, Problem } from '@/hooks/useLearningPath';

type Difficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';

interface TopicContent {
  title: string;
  description: string;
  content: string;
  level: string;
  problems: Problem[];
}

const TOPIC_DATA: Record<string, TopicContent> = {
  'methodology': {
    title: 'Methodology',
    description: 'Learn about problem-solving methodologies in programming',
    content: 'Content for methodology...',
    level: 'I',
    problems: [
      { id: 'meth-1', name: 'Problem Breakdown Practice', difficulty: 'EASY_IIII', required: true, reqOrder: 1, completed: false },
      { id: 'meth-2', name: 'Algorithm Design Steps', difficulty: 'EASY_III', required: true, reqOrder: 2, completed: false },
      { id: 'meth-3', name: 'Time Complexity Analysis', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'syntax': {
    title: 'Syntax',
    description: 'Master the basic syntax and structure of programming',
    level: 'I',
    content: 'Content for syntax...',
    problems: [
      { id: 'syn-1', name: 'Basic Variable Operations', difficulty: 'EASY_IIII', required: true, reqOrder: 1, completed: false },
      { id: 'syn-2', name: 'Control Flow Implementation', difficulty: 'EASY_II', required: false, completed: false }
    ]
  },
  'arrays': {
    title: 'Arrays',
    description: 'Understanding array data structures and operations',
    content: 'Content for arrays...',
    level: 'L3',
    problems: [
      { id: 'arr-1', name: 'Array Rotation', difficulty: 'EASY_III', required: true, reqOrder: 1, completed: false },
      { id: 'arr-2', name: 'Two Sum Problem', difficulty: 'EASY_II', required: true, reqOrder: 2, completed: false },
      { id: 'arr-3', name: 'Subarray Sum', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'hashing': {
    title: 'Hashing',
    description: 'Learn about hash tables and their applications',
    content: 'Content for hashing...',
    level: 'L4',
    problems: [
      { id: 'hash-1', name: 'Implement Hash Table', difficulty: 'MEDIUM', required: false, completed: false },
      { id: 'hash-2', name: 'First Non-Repeating Character', difficulty: 'EASY_II', required: false, completed: false }
    ]
  },
  'linked-list': {
    title: 'Linked List',
    description: 'Understanding linked list data structures',
    content: 'Content for linked list...',
    level: 'L4',
    problems: [
      { id: 'll-1', name: 'Reverse Linked List', difficulty: 'EASY_IIII', required: true, reqOrder: 1, completed: false },
      { id: 'll-2', name: 'Detect Cycle', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'stack-queue': {
    title: 'Stack/Queue',
    description: 'Learn about stack and queue data structures',
    content: 'Content for stack/queue...',
    level: 'L5',
    problems: [
      { id: 'sq-1', name: 'Valid Parentheses', difficulty: 'EASY_II', required: false, completed: false },
      { id: 'sq-2', name: 'Implement Queue using Stacks', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'binary-search': {
    title: 'Binary Search',
    description: 'Master the binary search algorithm',
    content: 'Content for binary search...',
    level: 'L5',
    problems: [
      { id: 'bs-1', name: 'Basic Binary Search', difficulty: 'EASY_III', required: true, reqOrder: 1, completed: false },
      { id: 'bs-2', name: 'Search in Rotated Array', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'binary-tree': {
    title: 'Binary Tree',
    description: 'Understanding binary tree data structures',
    content: 'Content for binary tree...',
    level: 'L5',
    problems: [
      { id: 'bt-1', name: 'Tree Traversal', difficulty: 'EASY_II', required: false, completed: false },
      { id: 'bt-2', name: 'Lowest Common Ancestor', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'backtracking': {
    title: 'Backtracking',
    description: 'Learn about backtracking algorithms',
    content: 'Content for backtracking...',
    level: 'L6',
    problems: [
      { id: 'back-1', name: 'N-Queens Problem', difficulty: 'HARD', required: true, reqOrder: 1, completed: false },
      { id: 'back-2', name: 'Subset Sum', difficulty: 'MEDIUM', required: false, completed: false }
    ]
  },
  'tries': {
    title: 'Tries',
    description: 'Understanding trie data structures',
    content: 'Content for tries...',
    level: 'L6',
    problems: [
      { id: 'trie-1', name: 'Implement Trie', difficulty: 'MEDIUM', required: false, completed: false },
      { id: 'trie-2', name: 'Word Search II', difficulty: 'HARD', required: true, reqOrder: 1, completed: false }
    ]
  },
  'heap-priority-queue': {
    title: 'Heap/Priority Queue',
    description: 'Learn about heap and priority queue data structures',
    content: 'Content for heap/priority queue...',
    level: 'L7',
    problems: [
      { id: 'heap-1', name: 'Kth Largest Element', difficulty: 'EASY_I', required: false, completed: false },
      { id: 'heap-2', name: 'Merge K Sorted Lists', difficulty: 'HARD', required: true, reqOrder: 1, completed: false }
    ]
  },
  'graphs': {
    title: 'Graphs',
    description: 'Understanding graph algorithms and applications',
    content: 'Content for graphs...',
    level: 'L7',
    problems: [
      { id: 'graph-1', name: 'BFS Implementation', difficulty: 'MEDIUM', required: false, completed: false },
      { id: 'graph-2', name: 'Shortest Path', difficulty: 'HARD', required: true, reqOrder: 1, completed: false }
    ]
  },
  'dynamic-programming': {
    title: 'Dynamic Programming',
    description: 'Master dynamic programming techniques',
    content: 'Content for dynamic programming...',
    level: 'L7',
    problems: [
      { id: 'dp-1', name: 'Fibonacci with DP', difficulty: 'EASY_I', required: false, completed: false },
      { id: 'dp-2', name: 'Longest Common Subsequence', difficulty: 'MEDIUM', required: false, completed: false },
      { id: 'dp-3', name: 'Edit Distance', difficulty: 'HARD', required: true, reqOrder: 1, completed: false }
    ]
  },
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      {difficulty}
    </span>
  );
}

export default function TopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { isAdminView } = useAdmin();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/learning/topics/${topicId}`);
        setTopic(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching topic:', err);
        setError('Failed to load topic data');
      } finally {
        setLoading(false);
      }
    };

    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

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
            <p className="mt-2">{error || 'The requested topic does not exist.'}</p>
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
          <p className="text-muted-foreground">Level {topic.order}</p>
        </div>
        {isAdminView && (
          <Button variant="outline">Edit Topic</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>{topic.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert">
            {topic.content}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Problems</CardTitle>
          <CardDescription>Practice problems for this topic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topic.problems.map((problem) => (
              <div
                key={problem.id}
                className="flex items-center px-4 py-2 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <Checkbox 
                  checked={problem.completed}
                  className="h-4 w-4 mr-6"
                  aria-label="Mark as completed"
                />
                <div className="w-[300px] font-medium">
                  {problem.name}
                </div>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {problem.difficulty}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                  {problem.required && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      REQ {problem.reqOrder}
                    </span>
                  )}
                  <Button variant="outline" size="sm">
                    Solve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isAdminView && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
            <CardDescription>Manage this topic's content and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button variant="outline">Edit Content</Button>
              <Button variant="outline">Manage Problems</Button>
              <Button variant="outline">View Analytics</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 