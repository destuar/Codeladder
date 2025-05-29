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
import { X, ListFilter, Loader2, Check, Filter, CheckCircle2, PenSquare, BookOpen, Hash, ChevronDown, ChevronUp, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
  slug?: string;
}

// Extend the Problem interface to include the properties we need
interface ExtendedProblem extends Problem {
  // Using problemType instead of type to match the Problem interface
  // problemType will be 'INFO', 'CODING', or 'STANDALONE_INFO' from the backend
  completed?: boolean;
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
  const [isShuffling, setIsShuffling] = useState(false);

  // New filter states
  const [selectedDifficulties, setSelectedDifficulties] = useState<ProblemDifficulty[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // "all", "completed", "incomplete"
  const [selectedType, setSelectedType] = useState<string>("all"); // "all", "coding", "info"
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Check for URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const difficultyParam = params.get('difficulty');
    
    if (difficultyParam) {
      setSelectedDifficulty(difficultyParam as DifficultyFilter);
    }
  }, []);

  // Fetch all problems
  const { data: problems, isLoading: isLoadingProblems } = useQuery<ExtendedProblem[]>({
    queryKey: ['allProblems'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/problems?includeCompletion=true', token);
      console.log('Problems fetched:', response.map((p: ExtendedProblem) => ({ id: p.id, name: p.name, slug: p.slug })));
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
    const difficultyOrder: ProblemDifficulty[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD'];
    
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
      setIsShuffling(false);
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
      setIsShuffling(false);
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
      
      // Difficulty filter (multi-select)
      const passesDifficultyFilter = 
        selectedDifficulties.length === 0 || 
        selectedDifficulties.includes(problem.difficulty as ProblemDifficulty);
      
      // Status filter
      const passesStatusFilter = 
        selectedStatus === 'all' || 
        (selectedStatus === 'completed' && problem.completed) ||
        (selectedStatus === 'incomplete' && !problem.completed);
      
      // Type filter - fixing the mapping between selectedType and actual problemType
      const passesTypeFilter = 
        selectedType === 'all' || 
        (selectedType === 'coding' && problem.problemType === 'CODING') ||
        (selectedType === 'info' && (problem.problemType === 'INFO' || problem.problemType === 'STANDALONE_INFO' || !problem.problemType));
      
      // Topic filter (multi-select)
      const passesTopicFilter = 
        selectedTopics.length === 0 || 
        (problem.topic && problem.topic.name && selectedTopics.includes(problem.topic.name));
      
      // Problem must pass all active filters
      return passesCollectionFilter && passesDifficultyFilter && 
             passesStatusFilter && passesTypeFilter && passesTopicFilter;
    }) || [];
  }, [
    problems, 
    selectedCollection, 
    selectedDifficulties, 
    selectedStatus, 
    selectedType, 
    selectedTopics
  ]);

  // Get problem counts for each collection
  const collectionProblemCounts = useMemo(() => {
    if (!problems) return {};
    
    const counts: Record<string, number> = { all: problems.length };
    
    collections.forEach(collection => {
      counts[collection.id] = problems.filter(
        problem => problem.collectionIds && problem.collectionIds.includes(collection.id)
      ).length;
    });
    
    return counts;
  }, [problems, collections]);

  // Get problem counts for each difficulty
  const difficultyProblemCounts = useMemo(() => {
    if (!problems) return {};
    
    const counts: Record<string, number> = { all: problems.length };
    
    difficulties.forEach(difficulty => {
      counts[difficulty] = problems.filter(
        problem => problem.difficulty === difficulty
      ).length;
    });
    
    return counts;
  }, [problems, difficulties]);

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

  // Get unique topics from problems
  const topics = useMemo(() => {
    if (!problems) return [];
    
    const topicSet = new Set<string>();
    
    problems.forEach(problem => {
      if (problem.topic && problem.topic.name) {
        topicSet.add(problem.topic.name);
      }
    });
    
    // Filter out empty topics and sort alphabetically
    return Array.from(topicSet)
      .filter(topic => topic.trim() !== '')
      .sort((a, b) => a.localeCompare(b));
  }, [problems]);

  // Toggle a difficulty in the multi-select
  const toggleDifficulty = (difficulty: ProblemDifficulty) => {
    setSelectedDifficulties(prev => {
      if (prev.includes(difficulty)) {
        return prev.filter(d => d !== difficulty);
      } else {
        return [...prev, difficulty];
      }
    });
  };

  // Toggle a topic in the multi-select
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Reset all advanced filters
  const resetAdvancedFilters = () => {
    setSelectedDifficulties([]);
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedTopics([]);
  };

  // Check if any advanced filters are active
  const hasAdvancedFilters = selectedDifficulties.length > 0 || 
                          selectedStatus !== 'all' || 
                          selectedType !== 'all' || 
                          selectedTopics.length > 0;

  // Add shuffle function
  const shuffleProblems = () => {
    // Only proceed if we have problems to shuffle
    if (filteredProblems.length > 0) {
      // Show loading state
      setIsShuffling(true);
      
      // Get a random problem from the filtered problems
      const randomIndex = Math.floor(Math.random() * filteredProblems.length);
      const randomProblem = filteredProblems[randomIndex];
      
      toast({
        title: "Random problem selected",
        description: `Selected: ${randomProblem.name}`,
        duration: 2000,
      });
      
      // Navigate to the randomly selected problem
      handleProblemStart(randomProblem.id, randomProblem.slug);
    }
  };

  if (isLoading) {
    return (
      <div className="font-mono relative bg-background min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="absolute inset-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div className="relative z-10 w-full max-w-md p-8 bg-background/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-xl border border-[#5271FF]/30 shadow-2xl shadow-[#5271FF]/10 dark:shadow-[#5271FF]/20">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono relative bg-background min-h-screen">
      <div className="absolute inset-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      <div className="container mx-auto pt-6 pb-8 relative z-10">
        <LoadingOverlay />
        
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <div className="flex items-center justify-between mt-12 lg:mt-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold leading-tight text-foreground">{currentCollectionName}</h1>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={shuffleProblems}
                        className="h-9 w-9 rounded-full bg-transparent dark:bg-transparent text-[#5271FF] hover:text-white hover:bg-[#5271FF]/80 dark:text-[#6B8EFF] dark:hover:text-white dark:hover:bg-[#6B8EFF]/80 transition-colors duration-150"
                        disabled={filteredProblems.length === 0 || isShuffling}
                      >
                        {isShuffling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shuffle className={cn("h-4 w-4", filteredProblems.length === 0 && "opacity-50")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
                      <p>Shuffle Problems</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleCollectionChange("all")}
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150",
                    selectedCollection === "all" 
                      ? "bg-[#5271FF] text-white hover:bg-[#415ACC] dark:bg-[#5271FF] dark:hover:bg-[#415ACC]"
                      : "bg-[#5271FF]/10 text-[#5271FF] hover:bg-[#5271FF]/20 dark:bg-[#6B8EFF]/10 dark:text-[#6B8EFF] dark:hover:bg-[#6B8EFF]/20"
                  )}
                >
                  All Collections
                  <span className={cn(
                    "ml-2 px-2 py-0.5 text-xs rounded-full font-semibold",
                    selectedCollection === "all"
                      ? "bg-white/20 text-white"
                      : "bg-[#5271FF]/20 text-[#5271FF] dark:bg-[#6B8EFF]/20 dark:text-[#6B8EFF]"
                  )}>
                    {collectionProblemCounts["all"] || 0}
                  </span>
                </button>
                  {collections.map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => handleCollectionChange(collection.id)}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150",
                      selectedCollection === collection.id 
                        ? "bg-[#5271FF] text-white hover:bg-[#415ACC] dark:bg-[#5271FF] dark:hover:bg-[#415ACC]"
                        : "bg-[#5271FF]/10 text-[#5271FF] hover:bg-[#5271FF]/20 dark:bg-[#6B8EFF]/10 dark:text-[#6B8EFF] dark:hover:bg-[#6B8EFF]/20"
                    )}
                  >
                      {collection.name}
                    <span className={cn(
                      "ml-2 px-2 py-0.5 text-xs rounded-full font-semibold",
                      selectedCollection === collection.id
                        ? "bg-white/20 text-white"
                        : "bg-[#5271FF]/20 text-[#5271FF] dark:bg-[#6B8EFF]/20 dark:text-[#6B8EFF]"
                    )}>
                      {collectionProblemCounts[collection.id] || 0}
                    </span>
                  </button>
                ))}
              </div>

              {selectedCollection !== 'all' && (
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={resetFilters}
                  className="w-full text-[#5271FF] dark:text-[#6B8EFF] hover:bg-[#5271FF]/10 dark:hover:bg-[#6B8EFF]/10 hover:text-[#5271FF] dark:hover:text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Selection
                </Button>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            <Collapsible 
              open={isFiltersOpen} 
              onOpenChange={setIsFiltersOpen}
              className="mb-1"
            >
              <div className="bg-background border border-border/40 rounded-md shadow-sm">
                <CollapsibleTrigger asChild>
                  <div className="px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors rounded-t-md">
                    <div className="text-lg flex items-center gap-2 justify-between">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        Problem Filters
                        {hasAdvancedFilters && (
                          <Badge variant="default" className="ml-2 bg-primary/90">
                            {selectedDifficulties.length + 
                             (selectedStatus !== 'all' ? 1 : 0) + 
                             (selectedType !== 'all' ? 1 : 0) + 
                             selectedTopics.length}
                          </Badge>
                        )}
                      </div>
                      {isFiltersOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t border-border/40">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Hash className="h-4 w-4 mr-2 text-indigo-500" />
                          <span className="text-sm font-medium">Difficulty</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {difficulties.map(difficulty => (
                            <button
                              key={difficulty}
                              onClick={() => toggleDifficulty(difficulty as ProblemDifficulty)}
                              className={cn(
                                "flex items-center px-3 py-1 rounded-full text-xs",
                                selectedDifficulties.includes(difficulty as ProblemDifficulty)
                                  ? "bg-indigo-500 text-white" 
                                  : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
                              )}
                            >
                              {formatDifficultyLabel(difficulty as DifficultyFilter)}
                              {selectedDifficulties.includes(difficulty as ProblemDifficulty) && (
                                <Check className="h-3 w-3 ml-1.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                          <span className="text-sm font-medium">Status</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedStatus("all")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-xs",
                              selectedStatus === "all"
                                ? "bg-emerald-500 text-white" 
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
                            )}
                          >
                            All
                            {selectedStatus === "all" && <Check className="h-3 w-3 ml-1.5" />}
                          </button>
                          <button
                            onClick={() => setSelectedStatus("completed")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-xs",
                              selectedStatus === "completed"
                                ? "bg-emerald-500 text-white" 
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
                            )}
                          >
                            Completed
                            {selectedStatus === "completed" && <Check className="h-3 w-3 ml-1.5" />}
                          </button>
                          <button
                            onClick={() => setSelectedStatus("incomplete")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-xs",
                              selectedStatus === "incomplete"
                                ? "bg-emerald-500 text-white" 
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
                            )}
                          >
                            Incomplete
                            {selectedStatus === "incomplete" && <Check className="h-3 w-3 ml-1.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <PenSquare className="h-4 w-4 mr-2 text-amber-500" />
                          <span className="text-sm font-medium">Type</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedType("all")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-xs",
                              selectedType === "all"
                                ? "bg-amber-500 text-white" 
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
                            )}
                          >
                            All
                            {selectedType === "all" && <Check className="h-3 w-3 ml-1.5" />}
                          </button>
                          <button
                            onClick={() => setSelectedType("coding")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-xs",
                              selectedType === "coding"
                                ? "bg-amber-500 text-white" 
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
                            )}
                          >
                            Code
                            {selectedType === "coding" && <Check className="h-3 w-3 ml-1.5" />}
                          </button>
                          <button
                            onClick={() => setSelectedType("info")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-xs",
                              selectedType === "info"
                                ? "bg-amber-500 text-white" 
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
                            )}
                          >
                            Info
                            {selectedType === "info" && <Check className="h-3 w-3 ml-1.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2 text-rose-500" />
                          <span className="text-sm font-medium">Topics</span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2">
                          {topics.map(topic => (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={cn(
                                "flex items-center px-3 py-1 rounded-full text-xs",
                                selectedTopics.includes(topic)
                                  ? "bg-rose-500 text-white" 
                                  : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
                              )}
                            >
                              {topic}
                              {selectedTopics.includes(topic) && (
                                <Check className="h-3 w-3 ml-1.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {hasAdvancedFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetAdvancedFilters}
                        className="mt-2"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reset Filters
                      </Button>
                    )}

                    {hasAdvancedFilters && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                        <span className="text-xs text-muted-foreground py-1">Active filters:</span>
                        
                        {selectedDifficulties.map(difficulty => (
                          <Badge key={difficulty} variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                            <span className="mr-1">Difficulty:</span>
                            {formatDifficultyLabel(difficulty as DifficultyFilter)}
                            <button 
                              className="ml-1 hover:text-destructive" 
                              onClick={() => toggleDifficulty(difficulty)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        
                        {selectedStatus !== 'all' && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                            <span className="mr-1">Status:</span>
                            {selectedStatus === 'completed' ? 'Completed' : 'Incomplete'}
                            <button 
                              className="ml-1 hover:text-destructive" 
                              onClick={() => setSelectedStatus('all')}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        
                        {selectedType !== 'all' && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            <span className="mr-1">Type:</span>
                            {selectedType === 'coding' ? 'Code Exercise' : 'Reading/Info'}
                            <button 
                              className="ml-1 hover:text-destructive" 
                              onClick={() => setSelectedType('all')}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        
                        {selectedTopics.map(topic => (
                          <Badge key={topic} variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                            <span className="mr-1">Topic:</span>
                            {topic}
                            <button 
                              className="ml-1 hover:text-destructive" 
                              onClick={() => toggleTopic(topic)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <div className="custom-problem-list">
              <ProblemList
                problems={filteredProblems}
                onProblemStart={handleProblemStart}
                hideHeader={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 