import { useParams } from 'react-router-dom';
import { useAdmin } from '../admin/AdminContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TopicContent {
  title: string;
  description: string;
  content: string;
  level: string;
}

const TOPIC_DATA: Record<string, TopicContent> = {
  'methodology': {
    title: 'Methodology',
    description: 'Learn about problem-solving methodologies in programming',
    content: 'Content for methodology...',
    level: 'I'
  },
  'syntax': {
    title: 'Syntax',
    description: 'Master the basic syntax and structure of programming',
    content: 'Content for syntax...',
    level: 'I'
  },
  'arrays': {
    title: 'Arrays',
    description: 'Understanding array data structures and operations',
    content: 'Content for arrays...',
    level: 'L3'
  },
  'hashing': {
    title: 'Hashing',
    description: 'Learn about hash tables and their applications',
    content: 'Content for hashing...',
    level: 'L4'
  },
  'linked-list': {
    title: 'Linked List',
    description: 'Understanding linked list data structures',
    content: 'Content for linked list...',
    level: 'L4'
  },
  'stack-queue': {
    title: 'Stack/Queue',
    description: 'Learn about stack and queue data structures',
    content: 'Content for stack/queue...',
    level: 'L5'
  },
  'binary-search': {
    title: 'Binary Search',
    description: 'Master the binary search algorithm',
    content: 'Content for binary search...',
    level: 'L5'
  },
  'binary-tree': {
    title: 'Binary Tree',
    description: 'Understanding binary tree data structures',
    content: 'Content for binary tree...',
    level: 'L5'
  },
  'backtracking': {
    title: 'Backtracking',
    description: 'Learn about backtracking algorithms',
    content: 'Content for backtracking...',
    level: 'L6'
  },
  'tries': {
    title: 'Tries',
    description: 'Understanding trie data structures',
    content: 'Content for tries...',
    level: 'L6'
  },
  'heap-priority-queue': {
    title: 'Heap/Priority Queue',
    description: 'Learn about heap and priority queue data structures',
    content: 'Content for heap/priority queue...',
    level: 'L7'
  },
  'graphs': {
    title: 'Graphs',
    description: 'Understanding graph algorithms and applications',
    content: 'Content for graphs...',
    level: 'L7'
  },
  'dynamic-programming': {
    title: 'Dynamic Programming',
    description: 'Master dynamic programming techniques',
    content: 'Content for dynamic programming...',
    level: 'L7'
  },
};

export default function TopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { isAdminView } = useAdmin();
  
  if (!topicId || !TOPIC_DATA[topicId]) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-destructive">Topic Not Found</h2>
            <p className="mt-2">The requested topic does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topic = TOPIC_DATA[topicId];

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{topic.title}</h1>
          <p className="text-muted-foreground">Level {topic.level}</p>
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

      {/* Add more sections based on your needs */}
      {isAdminView && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
            <CardDescription>Manage this topic's content and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button variant="outline">Edit Content</Button>
              <Button variant="outline">Manage Resources</Button>
              <Button variant="outline">View Analytics</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 