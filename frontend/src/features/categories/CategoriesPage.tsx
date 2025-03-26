import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import { Problem, Difficulty as ProblemDifficulty } from '@/features/problems/types';
import { cn } from '@/lib/utils';

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
}

// Type for difficulty filter - adds 'all' to the available difficulties
type DifficultyFilter = ProblemDifficulty | 'all';

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");

  // Fetch all problems
  const { data: problems, isLoading: isLoadingProblems } = useQuery<Problem[]>({
    queryKey: ['allProblems'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/problems?includeCompletion=true', token);
      return response;
    },
    enabled: !!token,
  });

  // Fetch all collections from our new public endpoint
  const { data: collections = [], isLoading: isLoadingCollections } = useQuery<Collection[]>({
    queryKey: ['publicCollections'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/collections/public', token);
      return response;
    },
    enabled: !!token,
  });

  // Extract unique difficulties from problems
  const difficulties = useMemo(() => {
    if (!problems) return [];
    
    const difficultySet = new Set<ProblemDifficulty>();
    
    problems.forEach(problem => {
      difficultySet.add(problem.difficulty as ProblemDifficulty);
    });
    
    // Define the order for difficulties
    const difficultyOrder: ProblemDifficulty[] = ['EASY_IIII', 'EASY_III', 'EASY_II', 'EASY_I', 'MEDIUM', 'HARD'];
    
    return difficultyOrder.filter(d => difficultySet.has(d));
  }, [problems]);

  // Handle difficulty change
  const handleDifficultyChange = (value: string) => {
    setSelectedDifficulty(value as DifficultyFilter);
  };

  // Handle starting a problem
  const handleProblemStart = (problemId: string) => {
    navigate(`/problem/${problemId}`);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCollection("all");
    setSelectedDifficulty("all");
  };

  // Filter problems based on all selected filters
  const filteredProblems = useMemo(() => {
    return problems?.filter(problem => {
      // Collection filter
      const passesCollectionFilter = 
        selectedCollection === 'all' || 
        (problem.collectionIds && problem.collectionIds.includes(selectedCollection));
      
      // Difficulty filter
      const passesDifficultyFilter = 
        selectedDifficulty === 'all' || 
        problem.difficulty === selectedDifficulty;
      
      // Problem must pass all active filters
      return passesCollectionFilter && passesDifficultyFilter;
    }) || [];
  }, [problems, selectedCollection, selectedDifficulty]);

  // Format difficulty label for display
  const formatDifficultyLabel = (difficulty: DifficultyFilter): string => {
    if (difficulty === 'all') return 'All Difficulties';
    return difficulty.replace(/_/g, ' ');
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCollection !== 'all' || selectedDifficulty !== 'all';

  // Show loading state while either problems or collections are loading
  const isLoading = isLoadingProblems || isLoadingCollections;

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
      {/* Categories List - no card wrapper */}
      <div className="custom-problem-list">
        <ProblemList
          problems={problems || []}
          collections={collections}
          selectedCollection={selectedCollection}
          onCollectionChange={setSelectedCollection}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={handleDifficultyChange}
          onProblemStart={handleProblemStart}
        />
      </div>
    </div>
  );
} 