import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import { Problem, Difficulty as ProblemDifficulty } from '@/features/problems/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { X, ListFilter, Loader2, Check, SlidersHorizontal, CheckCircle2, PenSquare, BookOpen, Hash, ChevronDown, ChevronUp, Shuffle, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingButton, LoadingCard, LoadingSpinner, PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/lib/logger';
import DottedBackground from "@/components/DottedBackground";
import { Input } from '@/components/ui/input';

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
}

// Type for difficulty filter - adds 'all' to the available difficulties
type DifficultyFilter = ProblemDifficulty | 'all';

// Shuffle Button Component
const ShuffleButton = ({ onClick, disabled, isShuffling, problemCount }: {
  onClick: () => void;
  disabled: boolean;
  isShuffling: boolean;
  problemCount: number;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          // size="icon" // Use explicit padding for consistent height with text
          onClick={onClick}
          className="h-9 px-3 rounded-md bg-transparent dark:bg-transparent text-[#5271FF] hover:text-white hover:bg-[#5271FF]/80 dark:text-[#6B8EFF] dark:hover:text-white dark:hover:bg-[#6B8EFF]/80 transition-colors duration-150 flex items-center gap-1.5 font-sans text-sm" // Added font-sans, text-sm, h-9, px-3
          disabled={disabled || isShuffling}
        >
          {isShuffling ? (
            <LoadingSpinner size="md" />
          ) : (
            <>
              <Shuffle className={cn("h-4 w-4", disabled && "opacity-50")} />
              <span className="sm:hidden">Shuffle</span> {/* Hidden on sm and up if icon only is preferred on larger mobile */} 
              <span className="hidden sm:inline">Shuffle Problems</span> {/* More descriptive on larger screens */} 
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md font-sans">
        <p>Shuffle Problems</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");

  // New filter states
  const [selectedDifficulties, setSelectedDifficulties] = useState<ProblemDifficulty[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // "all", "completed", "incomplete"
  const [selectedType, setSelectedType] = useState<string>("all"); // "all", "coding", "info"
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);

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
      logger.debug('Problems fetched:', response.map((p: ExtendedProblem) => ({ id: p.id, name: p.name, slug: p.slug })));
      return response;
    },
    enabled: !!token,
  });

  // Log fetched problems to inspect isCompleted status
  useEffect(() => {
    if (problems && problems.length > 0) {
      logger.debug('Fetched problems with isCompleted status:');
      problems.forEach(p => {
        logger.debug(`Problem: ${p.name} (ID: ${p.id}), isCompleted: ${p.isCompleted}`);
      });
    }
  }, [problems]);

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
    logger.debug('Problem navigation details:', { 
      problemId, 
      slug,
      hasSlug: !!slug,
      slugType: slug ? typeof slug : 'undefined',
      slugLength: slug ? slug.length : 0,
      navigationPath: slug ? `/problem/${slug}?${params}` : `/problems/${problemId}?${params}`
    });

    // Also log the actual problem object from our data
    const problemFromData = problems?.find(p => p.id === problemId);
    logger.debug('Problem data from state:', problemFromData ? {
      id: problemFromData.id,
      name: problemFromData.name,
      slug: problemFromData.slug,
      slugType: problemFromData.slug ? typeof problemFromData.slug : 'undefined',
      slugLength: problemFromData.slug ? problemFromData.slug.length : 0
    } : 'Not found');

    try {
      // Fetch the specific problem to get its slug (the all problems endpoint doesn't include slugs)
      if (!slug && token) {
        logger.debug('Fetching problem details to get slug...');
        
        const problemDetails = await api.get(`/problems/${problemId}`, token);
        logger.debug('Problem details:', { 
          id: problemDetails.id, 
          name: problemDetails.name, 
          slug: problemDetails.slug 
        });
        
        if (problemDetails.slug) {
          logger.debug(`Using fetched slug: ${problemDetails.slug}`);
          navigate(`/problem/${problemDetails.slug}?${params}`);
          return;
        } else {
          logger.debug(`Slug not found for problem ${problemId}, using ID-based navigation.`);
        }
      }
      
      // Fallback to ID-based navigation if no slug is available after fetch
      const navigationPath = slug ? `/problem/${slug}?${params}` : `/problems/${problemId}?${params}`;
      logger.debug(`Navigating to: ${navigationPath}`);
      navigate(navigationPath);

    } catch (error) {
      logger.error('Error fetching problem details', error);
      // Fallback to ID-based navigation on error
      navigate(`/problems/${problemId}?${params}`);
    } finally {
      clearTimeout(navigationTimeout);
      // We don't want to immediately set navigating to false here
      // It should remain true until the new page is loaded
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
      // Exclude STANDALONE_INFO problems upfront - THIS MUST BE PRESENT
      if (problem.problemType === 'STANDALONE_INFO') {
        return false;
      }

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
        (selectedStatus === 'completed' && problem.isCompleted) ||
        (selectedStatus === 'incomplete' && !problem.isCompleted);
      
      // Type filter - STANDALONE_INFO is already excluded above
      const passesTypeFilter = 
        selectedType === 'all' || 
        (selectedType === 'coding' && problem.problemType === 'CODING') ||
        (selectedType === 'info' && (problem.problemType === 'INFO' || !problem.problemType));
      
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

  // Create a new memoized list for problems that can be shuffled (excluding STANDALONE_INFO)
  const shuffleableFilteredProblems = useMemo(() => {
    return filteredProblems.filter(problem => problem.problemType !== 'STANDALONE_INFO');
  }, [filteredProblems]);

  // Get problem counts for each collection
  const collectionProblemCounts = useMemo(() => {
    if (!problems) return {};
    
    const counts: Record<string, number> = { 
      all: problems.filter(p => p.problemType !== 'STANDALONE_INFO').length 
    };
    
    collections.forEach(collection => {
      counts[collection.id] = problems.filter(
        problem => 
          problem.problemType !== 'STANDALONE_INFO' &&
          problem.collectionIds && 
          problem.collectionIds.includes(collection.id)
      ).length;
    });
    
    return counts;
  }, [problems, collections]);

  // Get problem counts for each difficulty
  const difficultyProblemCounts = useMemo(() => {
    if (!problems) return {};
    
    const counts: Record<string, number> = { 
      all: problems.filter(p => p.problemType !== 'STANDALONE_INFO').length 
    };
    
    difficulties.forEach(difficulty => {
      counts[difficulty] = problems.filter(
        problem => 
          problem.problemType !== 'STANDALONE_INFO' && 
          problem.difficulty === difficulty
      ).length;
    });
    
    return counts;
  }, [problems, difficulties]);

  // Format difficulty label for display
  const formatDifficultyLabel = (difficulty: DifficultyFilter): string => {
    if (difficulty === 'all') return 'All difficulties';
    return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
  };

  // Get current collection name
  const currentCollectionName = useMemo(() => {
    if (selectedCollection === 'all') {
      return 'All Companies';
    }
    const collection = collections.find(c => c.id === selectedCollection);
    return collection ? collection.name : 'All Companies';
  }, [selectedCollection, collections]);

  // Check if any filters are active
  const hasActiveFilters = selectedCollection !== 'all' || selectedDifficulty !== 'all';

  // Show loading state while either problems or collections are loading
  const isLoading = isLoadingProblems || isLoadingCollections;

  // Loading Overlay
  const LoadingOverlay = () => {
    if (!isNavigating) return null;

    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <PageLoadingSpinner />
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
    // Only proceed if we have shuffleable problems
    if (shuffleableFilteredProblems.length > 0) {
      // Show loading state
      setIsShuffling(true);
      
      // Get a random problem from the shuffleable filtered problems
      const randomIndex = Math.floor(Math.random() * shuffleableFilteredProblems.length);
      const randomProblem = shuffleableFilteredProblems[randomIndex];
      
      // Navigate to the randomly selected problem
      handleProblemStart(randomProblem.id, randomProblem.slug);
    }
  };

  // Filter collections based on search term
  const filteredCollections = useMemo(() => {
    if (!collectionSearch.trim()) return collections;
    
    return collections.filter(collection =>
      collection.name.toLowerCase().includes(collectionSearch.toLowerCase())
    );
  }, [collections, collectionSearch]);

  if (isLoadingProblems || isLoadingCollections) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageLoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <DottedBackground />
      <div className="relative z-10 container mx-auto p-4 md:p-6 lg:p-8 font-sans">
        <LoadingOverlay />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 mt-4 sm:mt-6">
          <div className="flex-1 mb-2 md:mb-0">
            <h1 className="text-3xl font-bold mb-4 text-center text-foreground font-mono">
              <span className="sm:hidden">Interview Questions</span>
              <span className="hidden sm:inline">Company Interview Questions</span>
            </h1>
            <p className="text-center text-muted-foreground font-mono">
              <span className="sm:hidden">Keep practicing smarter.</span>
              <span className="hidden sm:inline">The smarter way to practice.</span>
            </p>
          </div>
        </div>

        {/* Sidebar for Small Screens (Stacked) - MOVED AND MODIFIED */}
        <div className="xl:hidden mb-4"> {/* MODIFIED: Was 2xl:hidden, reduced spacing */}
          <Collapsible 
            open={isCollectionsOpen} 
            onOpenChange={setIsCollectionsOpen}
            className="max-w-xl mx-auto font-sans"
          >
            <div className="bg-background/80 dark:bg-background backdrop-blur-md overflow-hidden rounded-md shadow-md hover:shadow-lg transition-shadow duration-300 dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] border border-border/40 dark:border dark:border-[#5271FF]/15">
              <CollapsibleTrigger asChild>
                <div className="px-3 h-9 flex items-center cursor-pointer hover:bg-secondary/20 transition-colors rounded-t-md">
                  <div className="text-sm flex items-center gap-2 justify-between w-full">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      <h1 className="text-sm font-medium leading-tight text-foreground font-sans">{currentCollectionName}</h1>
                      {selectedCollection !== 'all' && (
                        <Badge 
                          variant="outline" 
                          className="ml-2 font-sans bg-white text-primary border-border dark:bg-muted dark:text-muted-foreground dark:border-muted"
                        >
                          {collectionProblemCounts[selectedCollection] || 0}
                        </Badge>
                      )}
                    </div>
                    {isCollectionsOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/40 pt-2 px-3 pb-4 space-y-4">
                {/* Collections Sidebar Content (Search, Buttons) */}
                {/* Search Input for Collections */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="pl-10 h-9 text-sm font-sans bg-background/50 border-border/60 focus:border-[#5271FF] dark:focus:border-[#6B8EFF] transition-colors"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleCollectionChange("all")}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-full text-sm transition-colors duration-150 font-sans",
                      selectedCollection === "all" 
                        ? "bg-[#5271FF] text-white hover:bg-[#415ACC] dark:bg-[#5271FF] dark:hover:bg-[#415ACC]"
                        : "bg-[#5271FF]/10 text-[#5271FF] hover:bg-[#5271FF]/20 dark:bg-[#6B8EFF]/10 dark:text-[#6B8EFF] dark:hover:bg-[#6B8EFF]/20"
                    )}
                  >
                    All Companies
                    <span className={cn(
                      "ml-2 px-2 py-0.5 text-xs rounded-full font-semibold",
                      selectedCollection === "all"
                        ? "bg-white/20 text-white"
                        : "bg-[#5271FF]/20 text-[#5271FF] dark:bg-[#6B8EFF]/20 dark:text-[#6B8EFF]"
                    )}>
                      {collectionProblemCounts["all"] || 0}
                    </span>
                  </button>
                  {filteredCollections.map(collection => (
                    <button
                      key={collection.id}
                      onClick={() => handleCollectionChange(collection.id)}
                      className={cn(
                        "flex items-center px-3 py-1.5 rounded-full text-sm transition-colors duration-150 font-sans",
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
                {(selectedCollection !== 'all' || collectionSearch.trim()) && (
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      resetFilters();
                      setCollectionSearch("");
                    }}
                    className="w-full text-[#5271FF] dark:text-[#6B8EFF] hover:bg-[#5271FF]/10 dark:hover:bg-[#6B8EFF]/10 hover:text-[#5271FF] dark:hover:text-white font-sans text-sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset Selection
                  </Button>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* New layout: Centered Problem Area with Sidebar to its left */}
        <div className="relative max-w-4xl mx-auto xl:mt-8"> {/* Changed max-w-3xl to max-w-4xl, removed mobile top margin for better flow */} 
          {/* Sidebar for Medium+ Screens (Absolutely Positioned) */}
          <div className="hidden xl:block xl:absolute xl:right-[calc(100%+1rem)] xl:top-0 xl:w-64"> 
            <div className="xl:sticky xl:top-20 space-y-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] bg-background/80 dark:bg-background backdrop-blur-md overflow-hidden p-4 border border-border/40 dark:border dark:border-[#5271FF]/15">
              {/* Collections Sidebar Content (Title, Search, Shuffle, Buttons) */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight text-foreground font-sans">{currentCollectionName}</h1>
              </div>
              
              {/* Search Input for Collections */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  className="pl-10 h-9 text-sm font-sans bg-background/50 border-border/60 focus:border-[#5271FF] dark:focus:border-[#6B8EFF] transition-colors"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleCollectionChange("all")}
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-full text-sm transition-colors duration-150 font-sans",
                    selectedCollection === "all" 
                      ? "bg-[#5271FF] text-white hover:bg-[#415ACC] dark:bg-[#5271FF] dark:hover:bg-[#415ACC]"
                      : "bg-[#5271FF]/10 text-[#5271FF] hover:bg-[#5271FF]/20 dark:bg-[#6B8EFF]/10 dark:text-[#6B8EFF] dark:hover:bg-[#6B8EFF]/20"
                  )}
                >
                  All Companies
                  <span className={cn(
                    "ml-2 px-2 py-0.5 text-xs rounded-full font-semibold",
                    selectedCollection === "all"
                      ? "bg-white/20 text-white"
                      : "bg-[#5271FF]/20 text-[#5271FF] dark:bg-[#6B8EFF]/20 dark:text-[#6B8EFF]"
                  )}>
                    {collectionProblemCounts["all"] || 0}
                  </span>
                </button>
                {filteredCollections.map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => handleCollectionChange(collection.id)}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-full text-sm transition-colors duration-150 font-sans",
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
              {(selectedCollection !== 'all' || collectionSearch.trim()) && (
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    resetFilters();
                    setCollectionSearch("");
                  }}
                  className="w-full text-[#5271FF] dark:text-[#6B8EFF] hover:bg-[#5271FF]/10 dark:hover:bg-[#6B8EFF]/10 hover:text-[#5271FF] dark:hover:text-white font-sans text-sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Selection
                </Button>
              )}
            </div>
          </div>

          {/* Problem Filters and List (This is the content of the centered block) */}
          <div>
            <Collapsible 
              open={isFiltersOpen} 
              onOpenChange={setIsFiltersOpen}
              className="mb-4 font-sans"
            >
              <div className="bg-background/80 dark:bg-background backdrop-blur-md overflow-hidden rounded-md shadow-md hover:shadow-lg transition-shadow duration-300 dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] dark:border dark:border-[#5271FF]/15">
                <CollapsibleTrigger asChild>
                  <div className="px-3 h-9 flex items-center cursor-pointer hover:bg-secondary/20 transition-colors rounded-t-md">
                    <div className="text-sm flex items-center gap-2 justify-between w-full">
                      <div className="flex items-center">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        <span className="font-medium">Problem Filters</span>
                        {hasAdvancedFilters && (
                          <Badge 
                            variant="outline" 
                            className="ml-2 font-sans bg-white text-primary border-border dark:bg-muted dark:text-muted-foreground dark:border-muted"
                          >
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
                <CollapsibleContent className="border-t border-border/40 pt-2 px-3 pb-4 space-y-4">
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Hash className="h-4 w-4 mr-2 text-indigo-500" />
                          <span className="text-sm font-medium font-sans">Difficulty</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {difficulties.map(difficulty => (
                            <button
                              key={difficulty}
                              onClick={() => toggleDifficulty(difficulty as ProblemDifficulty)}
                              className={cn(
                                "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                          <span className="text-sm font-medium font-sans">Status</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedStatus("all")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                              "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                              "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                          <span className="text-sm font-medium font-sans">Type</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedType("all")}
                            className={cn(
                              "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                              "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                              "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                          <span className="text-sm font-medium font-sans">Topics</span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2">
                          {topics.map(topic => (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={cn(
                                "flex items-center px-3 py-1 rounded-full text-sm font-sans",
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
                        className="mt-2 font-sans text-sm"
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

            <div>
              {filteredProblems.length > 0 ? (
                <ProblemList 
                  problems={filteredProblems} 
                  onProblemStart={handleProblemStart} 
                  hideHeader={true} 
                  onShuffleClick={shuffleProblems}
                  isShuffling={isShuffling}
                  shuffleDisabled={shuffleableFilteredProblems.length === 0}
                />
              ) : (
                <p className="text-center text-muted-foreground font-sans">No problems found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 