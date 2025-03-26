import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import { Problem, Difficulty as ProblemDifficulty } from '@/features/problems/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { X, ListFilter, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
  slug?: string;
}

// Type for difficulty filter - adds 'all' to the available difficulties
type DifficultyFilter = ProblemDifficulty | 'all';

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");
  const [isNavigating, setIsNavigating] = useState(false);

  // Check for URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const difficultyParam = params.get('difficulty');
    
    if (difficultyParam) {
      setSelectedDifficulty(difficultyParam as DifficultyFilter);
    }
  }, []);

  // Fetch all problems
  const { data: problems, isLoading: isLoadingProblems } = useQuery<Problem[]>({
    queryKey: ['allProblems'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/problems?includeCompletion=true', token);
      console.log('Problems fetched:', response.map((p: Problem) => ({ id: p.id, name: p.name, slug: p.slug })));
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

  // Update selectedCollection when the URL slug changes
  useEffect(() => {
    if (slug && collections.length > 0) {
      // If there's a slug in the URL, find the matching collection
      const collection = collections.find(c => c.id === slug || c.slug === slug);
      if (collection) {
        setSelectedCollection(collection.id);
      }
    } else if (!slug) {
      // If there's no slug, set to 'all'
      setSelectedCollection("all");
    }
  }, [slug, collections]);

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
    // Update URL for better sharing/bookmarking
    const url = new URL(window.location.href);
    if (value !== 'all') {
      url.searchParams.set('difficulty', value);
      window.history.pushState({}, '', url.toString());
    } else {
      url.searchParams.delete('difficulty');
      window.history.pushState({}, '', url.toString());
    }
  };

  // Handle collection change
  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    
    if (value !== 'all') {
      const collection = collections.find(c => c.id === value);
      // Navigate to collection-specific URL - prefer slug if available
      navigate(`/collections/${collection?.slug || collection?.id || value}`);
    } else {
      // Navigate to all collections
      navigate('/collections');
    }
  };

  // Handle starting a problem
  const handleProblemStart = async (problemId: string, slug?: string) => {
    // Show loading state
    setIsNavigating(true);

    // Set up a timeout to clear the loading state in case navigation takes too long
    const navigationTimeout = setTimeout(() => {
      setIsNavigating(false);
    }, 5000); // Clear after 5 seconds max

    // Add query parameters for context
    const currentCollection = selectedCollection !== 'all' ? 
      collections.find(c => c.id === selectedCollection) : null;
      
    const params = new URLSearchParams({
      from: 'collection',
      name: currentCollectionName,
      ...(currentCollection?.slug ? { slug: currentCollection.slug } : { id: selectedCollection !== 'all' ? selectedCollection : 'all' })
    }).toString();

    // Enhanced debug logging
    console.log('Problem navigation details:', { 
      problemId, 
      slug,
      hasSlug: !!slug,
      slugType: slug ? typeof slug : 'undefined',
      slugLength: slug ? slug.length : 0,
      navigationPath: slug ? `/problem/${slug}?${params}` : `/problems/${problemId}?${params}`
    });

    // Also log the actual problem object from our data
    const problemFromData = problems?.find(p => p.id === problemId);
    console.log('Problem data from state:', problemFromData ? {
      id: problemFromData.id,
      name: problemFromData.name,
      slug: problemFromData.slug,
      slugType: problemFromData.slug ? typeof problemFromData.slug : 'undefined',
      slugLength: problemFromData.slug ? problemFromData.slug.length : 0
    } : 'Not found');

    try {
      // Fetch the specific problem to get its slug (the all problems endpoint doesn't include slugs)
      if (!slug && token) {
        console.log('Fetching problem details to get slug...');
        // Show a toast notification
        toast({
          title: "Loading problem...",
          description: `Getting details for ${problemFromData?.name || 'selected problem'}`
        });
        
        const problemDetails = await api.get(`/problems/${problemId}`, token);
        console.log('Problem details:', { 
          id: problemDetails.id, 
          name: problemDetails.name, 
          slug: problemDetails.slug 
        });
        
        if (problemDetails.slug) {
          console.log(`Using fetched slug: ${problemDetails.slug}`);
          navigate(`/problem/${problemDetails.slug}?${params}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching problem details:', error);
      toast({
        title: "Error loading problem",
        description: "Unable to fetch problem details. Using ID-based navigation instead.",
        variant: "destructive"
      });
    } finally {
      clearTimeout(navigationTimeout);
      setIsNavigating(false);
    }

    // Always prefer the slug if available and not empty
    if (slug && slug.trim().length > 0) {
      navigate(`/problem/${slug}?${params}`);
    } else {
      navigate(`/problems/${problemId}?${params}`);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCollection("all");
    setSelectedDifficulty("all");
    // Navigate to base collections URL
    navigate('/collections');
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

  // Get current collection name
  const currentCollectionName = useMemo(() => {
    if (selectedCollection === 'all') {
      return 'All Collections';
    }
    const collection = collections.find(c => c.id === selectedCollection);
    return collection ? collection.name : 'All Collections';
  }, [selectedCollection, collections]);

  // Check if any filters are active
  const hasActiveFilters = selectedCollection !== 'all' || selectedDifficulty !== 'all';

  // Show loading state while either problems or collections are loading
  const isLoading = isLoadingProblems || isLoadingCollections;

  // Loading overlay for problem navigation
  const LoadingOverlay = () => {
    if (!isNavigating) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-foreground text-sm">Loading problem...</p>
        </div>
      </div>
    );
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
    <div className="container py-8">
      {/* Loading overlay */}
      <LoadingOverlay />
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Collection Name */}
        <div className="col-span-3">
          <div className="sticky top-20">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="text-xl font-semibold">{currentCollectionName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCollection === 'all' 
                    ? 'Problems list showing all problems' 
                    : `Problems in ${currentCollectionName} collection`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Center column - Problem List */}
        <div className="col-span-6">
          <div className="custom-problem-list overflow-hidden">
            <ProblemList
              problems={filteredProblems}
              onProblemStart={handleProblemStart}
              hideHeader={true}
            />
          </div>
        </div>

        {/* Right column - Filters */}
        <div className="col-span-3">
          <div className="sticky top-20">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListFilter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Collection filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Collection</label>
                  <Select 
                    value={selectedCollection} 
                    onValueChange={handleCollectionChange}
                  >
                    <SelectTrigger className="w-full h-9 focus:ring-blue-500/30 bg-background border-border/40">
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

                {/* Difficulty filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select 
                    value={selectedDifficulty} 
                    onValueChange={handleDifficultyChange}
                  >
                    <SelectTrigger className="w-full h-9 focus:ring-blue-500/30 bg-background border-border/40">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      {difficulties.map(difficulty => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {formatDifficultyLabel(difficulty as DifficultyFilter)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset filters button */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="w-full mt-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 