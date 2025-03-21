import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import type { Problem } from '@/hooks/useLearningPath';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, PlayCircle, RepeatIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Difficulty as ProblemDifficulty } from '@/features/problems/types';

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
}

// Type for difficulty filter - adds 'all' to the available difficulties
type DifficultyFilter = ProblemDifficulty | 'all';

export default function ProblemsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");

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
        <CardContent className="space-y-4">
          <div className="problem-list-wrapper">
            {/* Custom rendering of ProblemList to control positioning */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Find and render the next problem to continue with (first incomplete required problem) */}
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "h-32 flex flex-col items-center justify-center gap-2 border-2",
                  filteredProblems.find(p => !p.completed && p.required) ? 
                    "hover:border-primary" : "opacity-50 cursor-not-allowed"
                )}
                disabled={!filteredProblems.find(p => !p.completed && p.required)}
                onClick={() => {
                  const nextProblem = filteredProblems
                    .filter(p => !p.completed && p.required)
                    .sort((a, b) => (a.reqOrder || Infinity) - (b.reqOrder || Infinity))[0];
                  if (nextProblem) {
                    handleProblemStart(nextProblem.id);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <PlayCircle className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Continue</div>
                    {filteredProblems.find(p => !p.completed && p.required) ? (
                      <div className="text-sm text-muted-foreground mt-1">
                        {(() => {
                          const nextProblem = filteredProblems
                            .filter(p => !p.completed && p.required)
                            .sort((a, b) => (a.reqOrder || Infinity) - (b.reqOrder || Infinity))[0];
                          return nextProblem ? 
                            `${nextProblem.name}${nextProblem.reqOrder ? ` (#${nextProblem.reqOrder})` : ''}` : 
                            '';
                        })()}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-1">All problems completed!</div>
                    )}
                  </div>
                </div>
              </Button>
              
              {/* Spaced Repetition button */}
              <Button
                variant="outline"
                size="lg"
                className="h-32 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary"
                onClick={() => {/* TODO: Implement spaced repetition */}}
              >
                <div className="flex flex-col items-center gap-2">
                  <RepeatIcon className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Spaced Repetition</div>
                    <div className="text-sm text-muted-foreground mt-1">Review completed problems</div>
                  </div>
                </div>
              </Button>
            </div>

            {/* Filters Section - positioned below the buttons */}
            <div className="space-y-4 pt-4 border-t mb-8">
              <div className="flex flex-wrap gap-4">
                {/* Collection filter dropdown */}
                {collections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Collection:</span>
                    <Select 
                      value={selectedCollection} 
                      onValueChange={handleCollectionChange}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Collections</SelectItem>
                        {collections.map(collection => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Difficulty filter dropdown */}
                {difficulties.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Difficulty:</span>
                    <Select 
                      value={selectedDifficulty} 
                      onValueChange={handleDifficultyChange}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        {difficulties.map(difficulty => (
                          <SelectItem key={difficulty} value={difficulty}>
                            {formatDifficultyLabel(difficulty)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reset filters button - only show if any filters are active */}
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters}
                    className="h-10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Active filter badges */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {selectedCollection !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Collection: {collections.find(c => c.id === selectedCollection)?.name}
                      <X 
                        className="h-3 w-3 cursor-pointer ml-1" 
                        onClick={() => setSelectedCollection('all')}
                      />
                    </Badge>
                  )}
                  {selectedDifficulty !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Difficulty: {formatDifficultyLabel(selectedDifficulty)}
                      <X 
                        className="h-3 w-3 cursor-pointer ml-1" 
                        onClick={() => setSelectedDifficulty('all')}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {filteredProblems.length > 0 ? (
              <div className="custom-problem-list">
                <ProblemList
                  problems={filteredProblems}
                  onProblemStart={handleProblemStart}
                  itemsPerPage={50}
                  showTopicName={false}
                  showOrder={false}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {problems && problems.length > 0 ? 
                  'No problems match the current filters. Try adjusting your filter criteria.' : 
                  'No problems available'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 