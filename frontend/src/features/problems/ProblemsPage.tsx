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
  slug?: string;
}

// Type for difficulty filter - adds 'all' to the available difficulties
type DifficultyFilter = ProblemDifficulty | 'all';

export default function ProblemsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");
  
  // Add spaced repetition hook
  const { toggleReviewPanel, isReviewPanelOpen, stats } = useSpacedRepetition();

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

  const handleProblemStart = (problemId: string, slug?: string) => {
    // Add query parameters for collection context if a collection is selected
    const params = selectedCollection !== 'all' ? new URLSearchParams({
      from: 'collection',
      name: collections.find(c => c.id === selectedCollection)?.name || 'Collection',
      id: selectedCollection,
      // Include the collection slug if available
      collectionSlug: collections.find(c => c.id === selectedCollection)?.slug || ''
    }).toString() : '';

    if (slug) {
      navigate(`/problem/${slug}${params ? `?${params}` : ''}`);
    } else {
      navigate(`/problems/${problemId}${params ? `?${params}` : ''}`);
    }
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
        <CardContent className="p-6">
          {isLoadingProblems ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary"></div>
            </div>
          ) : problems?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No problems found
            </div>
          ) : (
            <>
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
                      
                      {/* Button to view the collection page */}
                      {selectedCollection !== 'all' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const collection = collections.find(c => c.id === selectedCollection);
                            if (collection?.slug) {
                              navigate(`/collection/${collection.slug}`);
                            }
                          }}
                        >
                          View Collection Page
                        </Button>
                      )}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 