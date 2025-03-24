import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import { Problem, Difficulty as ProblemDifficulty } from '@/features/problems/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, PlayCircle, RepeatIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpacedRepetition } from '@/features/spaced-repetition/hooks/useSpacedRepetition';
import { SpacedRepetitionPanel } from '@/features/spaced-repetition/components/SpacedRepetitionPanel';

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
}

// Type for difficulty filter - adds 'all' to the available difficulties
type DifficultyFilter = ProblemDifficulty | 'all';

// Custom hook to only use spaced repetition when needed
function useConditionalSpacedRepetition(enabled: boolean) {
  // Only call useSpacedRepetition when enabled
  if (enabled) {
    return useSpacedRepetition();
  }
  
  // Return a placeholder object when disabled
  return {
    dueReviews: [],
    allScheduledReviews: undefined,
    stats: undefined,
    isLoading: false,
    isReviewPanelOpen: false,
    toggleReviewPanel: () => {},
    submitReview: async () => null,
    startReview: () => {},
    refreshReviews: async () => {},
    removeProblem: async () => {},
    addCompletedProblem: async () => {},
    isAddingProblem: false,
    getAvailableProblems: async () => [],
    isLoadingAvailableProblems: false
  };
}

export default function ProblemsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");
  
  // Add spaced repetition hook
  const { toggleReviewPanel, isReviewPanelOpen, stats } = useConditionalSpacedRepetition(!!token);

  // Add CSS to hide the buttons in ProblemList
  useEffect(() => {
    // Add a style element to hide the buttons in ProblemList
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .custom-problem-list .space-y-8 > .grid,
      .custom-problem-list .space-y-8 > div:first-child {
        display: none;
      }
    `;
    document.head.appendChild(styleEl);

    // Clean up when component unmounts
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

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

  const handleProblemStart = (problemId: string) => {
    navigate(`/problems/${problemId}`);
  };

  // Handle filter changes
  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollection(collectionId);
  };

  const handleDifficultyChange = (difficulty: DifficultyFilter) => {
    setSelectedDifficulty(difficulty);
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
      {/* Spaced repetition panel if open */}
      {isReviewPanelOpen && (
        <div className="bg-card p-6 rounded-lg shadow-sm">
          <SpacedRepetitionPanel />
        </div>
      )}

      {/* Problem List - no card wrapper */}
      <div>
        {filteredProblems.length > 0 ? (
          <div className="custom-problem-list">
            <ProblemList
              problems={filteredProblems}
              onProblemStart={handleProblemStart}
              itemsPerPage={50}
              showTopicName={false}
              showOrder={false}
              enableSpacedRepetition={true}
              collections={collections}
              selectedCollection={selectedCollection}
              onCollectionChange={handleCollectionChange}
              difficulties={difficulties as string[]}
              selectedDifficulty={selectedDifficulty as string}
              onDifficultyChange={handleDifficultyChange as (value: string) => void}
              resetFilters={hasActiveFilters ? resetFilters : undefined}
              formatDifficultyLabel={(d: string) => formatDifficultyLabel(d as DifficultyFilter)}
            />
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            {problems && problems.length > 0 ? 
              'No problems match the current filters. Try adjusting your filter criteria.' : 
              'No problems available'}
          </div>
        )}
      </div>
    </div>
  );
} 