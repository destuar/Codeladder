import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import type { Problem } from '@/hooks/useLearningPath';

export default function ProblemsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ['allProblems'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/problems?includeCompletion=true', token);
      return response;
    },
    enabled: !!token,
  });

  const handleProblemStart = (problemId: string) => {
    navigate(`/problems/${problemId}`);
  };

  if (isLoading) {
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

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Problems</h1>
        <p className="text-muted-foreground">All available problems and info pages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem List</CardTitle>
          <CardDescription>
            Browse and practice all available problems across topics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {problems && problems.length > 0 ? (
            <ProblemList
              problems={problems}
              onProblemStart={handleProblemStart}
              itemsPerPage={50}
              showTopicName={true}
              showOrder={false}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No problems available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 