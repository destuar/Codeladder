import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import type { Topic, Problem } from "@/hooks/useLearningPath";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";
import { Lock, Check, ChevronRight, Award, Star, FileText, History, GraduationCap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { LoadingCard, LoadingSpinner, PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/lib/logger';

// Define the Level interface with tests property
interface Level {
  id: string;
  name: string;
  order: number;
  description?: string;
  topics: Topic[];
  tests?: {
    id: string;
    name: string;
    description?: string;
    levelId: string;
  }[];
  hasPassedExam?: boolean;
}

function ProgressBar({ progress = 0, dimmed = false }: { progress?: number, dimmed?: boolean }) {
  return (
    <div className={cn(
      "w-full h-2.5 bg-primary/10 rounded-full overflow-hidden mt-2",
      dimmed && "opacity-50"
    )}>
      <div 
        className={cn(
          "h-full transition-all duration-500 ease-out rounded-full",
          dimmed ? "bg-muted-foreground" :
          progress === 100 ? "bg-green-600 dark:bg-green-500" : "bg-primary"
        )}
        style={{ 
          width: `${progress}%`,
          boxShadow: progress > 0 && !dimmed ? '0 0 8px rgba(var(--primary), 0.3)' : 'none'
        }}
      />
    </div>
  );
}

export function LevelSystem() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navigate = useNavigate();
  const { token } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { 
    data: levels, 
    isLoading: loading, // Initial load indicator
    isFetching, // Background refetch indicator
    error 
  } = useQuery<Level[]>({
    queryKey: ['learningPath'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      
      // Fetch levels - the response now includes tests directly
      const levelsData = await api.get('/learning/levels', token);
      
      // No need for secondary fetch, data should be complete
      if (!Array.isArray(levelsData)) {
        logger.error("Expected levelsData to be an array", levelsData);
        return []; // Return empty array if data format is unexpected
      }

      // Log test counts for debugging in development only
      levelsData.forEach(level => {
        logger.debug(`Level: ${level.name}, Tests: ${level.tests?.length || 0}`);
      });
      
      return levelsData;
    },
    enabled: !!token,
    staleTime: 1000 * 60, // 1 minute stale time
    gcTime: 1000 * 60 * 30, // 30 minutes cache time
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Add click outside handler to close the button
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeButtonIndex !== null) {
        // Check if the click was outside all button refs
        let clickedOutside = true;
        
        Object.values(buttonRefs.current).forEach(ref => {
          if (ref && ref.contains(event.target as Node)) {
            clickedOutside = false;
          }
        });
        
        if (clickedOutside) {
          // Reset shadow for the previously active button when closing
          if (activeButtonIndex !== null && levels && levels[activeButtonIndex]) {
            const levelId = levels[activeButtonIndex].id;
            const buttonContainer = buttonRefs.current[`level-${levelId}`];
            
            if (buttonContainer) {
              // Find the front face element and reset its shadow
              const frontFace = buttonContainer.querySelector('.backface-hidden:not(.rotate-y-180)');
              if (frontFace && frontFace instanceof HTMLElement) {
                frontFace.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
              }
            }
          }
          
          setActiveButtonIndex(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeButtonIndex, levels]);

  // Calculate progress for a topic
  const calculateTopicProgress = (topic: Topic) => {
    const requiredProblems = topic.problems.filter(p => p.required);
    if (requiredProblems.length === 0) return 0;
    
    const completedRequired = requiredProblems.filter(p => p.completed).length;
    return Math.round((completedRequired / requiredProblems.length) * 100);
  };

  // Check if a level is completed
  const isLevelCompleted = (level: Level) => {
    return level.topics.every(topic => {
      const progress = calculateTopicProgress(topic);
      return progress === 100;
    });
  };

  // Calculate overall level progress percentage
  const calculateLevelProgress = (level: Level) => {
    if (!level.topics || level.topics.length === 0) return 0;
    
    const topicProgresses = level.topics.map(calculateTopicProgress);
    const totalProgress = topicProgresses.reduce((sum, progress) => sum + progress, 0);
    return Math.round(totalProgress / level.topics.length);
  };

  // Find the current active level index
  const findCurrentLevelIndex = () => {
    if (!levels) return 0;
    
    // Find the first incomplete level
    for (let i = 0; i < levels.length; i++) {
      if (!isLevelCompleted(levels[i])) {
        return i;
      }
    }
    
    // If all levels are complete, return the last level
    return levels.length - 1;
  };

  // Check if a level should be dimmed (locked) based on cascading unlock logic
  const shouldDimLevel = (currentIndex: number) => {
    if (!levels || levels.length === 0) return false;
    
    // Find the index of the highest level where the user passed an exam
    let maxPassedIndex = -1;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (levels[i].hasPassedExam === true) {
        maxPassedIndex = i;
        break; // Found the highest index
      }
    }
    
    // A level at currentIndex is unlocked if its index is less than or equal to maxPassedIndex + 1
    // Therefore, it should be dimmed if currentIndex > maxPassedIndex + 1
    return currentIndex > maxPassedIndex + 1;
  };

  const handleTopicClick = (topic: Topic) => {
    if (topic.slug) {
      navigate(`/topic/${topic.slug}`);
    } else {
      navigate(`/topics/${topic.id}`);
    }
  };

  const handleTestHistory = (level: Level, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the flip animation
    
    logger.debug("Navigating to test history for level:", level.id);
    navigate(`/tests/history/${level.id}`, {
      state: { 
        levelId: level.id,
        levelName: level.name
      }
    });
  };

  const handleStartNextTest = async (levelId: string, levelName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent flip
    if (!token || isLoadingTest) return;

    setIsLoadingTest(true);
    try {
      // Fetch the response object containing the ID
      const response = await api.getNextTestForLevel(levelId, token);
      // Extract the actual ID string
      const nextTestId = response?.nextAssessmentId;

      if (nextTestId) {
        logger.debug(`Navigating to next test ID: ${nextTestId} for level ${levelId}`);
        navigate(`/assessment/test/${nextTestId}`, { state: { levelId, levelName } });
      } else {
        logger.debug(`No next test available for level ${levelId} (${levelName}).`);
      }
    } catch (error) { // Catch potential errors from the API call itself
      logger.error("Error fetching next test", error);
      toast({
        title: "Error",
        description: "Could not determine the next test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTest(false);
    }
  };

  const handleButtonClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Reset shadow for the previously active button when switching
    if (activeButtonIndex !== null && activeButtonIndex !== index && levels && levels[activeButtonIndex]) {
      const previousLevelId = levels[activeButtonIndex].id;
      const previousButtonContainer = buttonRefs.current[`level-${previousLevelId}`];
      
      if (previousButtonContainer) {
        // Find the front face element and reset its shadow
        const frontFace = previousButtonContainer.querySelector('.backface-hidden:not(.rotate-y-180)');
        if (frontFace && frontFace instanceof HTMLElement) {
          frontFace.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
        }
      }
    }
    
    // Toggle the active state
    setActiveButtonIndex(prevIndex => prevIndex === index ? null : index);
  };

  // Determine if a background refetch is happening *after* the initial load
  const isBackgroundRefetching = isFetching && Array.isArray(levels) && levels.length > 0;

  // Show full loading state only on initial load OR during refetch when no placeholder data is used
  if (loading && !levels) { 
    return (
      <div className="flex justify-center items-center p-8">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error instanceof Error ? error.message : 'Failed to load learning path'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Safely calculate currentLevelIndex only if levels is an array
  const currentLevelIndex = Array.isArray(levels) ? findCurrentLevelIndex() : 0;

  return (
    <div className={cn(
      "space-y-6 transition-opacity duration-300 relative font-sans",
    )}>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .rotate-button {
            transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
            transform-style: preserve-3d;
          }
          
          .rotate-button.active {
            transform: rotateY(180deg);
          }
          
          .backface-hidden {
            backface-visibility: hidden;
          }
          
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
          
          .perspective-[800px] {
            perspective: 800px;
          }
        `}
      </style>

      {/* Render a container div and then conditionally render desktop or mobile inside it */}
      <div>
        {isDesktop ? (
          <div className="relative hidden md:grid gap-6"> {/* Desktop view - hidden below md, grid layout */} 
            {/* Ensure levels is an array before mapping */} 
            {Array.isArray(levels) && levels.length > 0 ? (
              levels.map((level, index) => {
                const isDimmed = shouldDimLevel(index);
                const isActive = currentLevelIndex === index;
                const isComplete = isLevelCompleted(level);
                const levelProgress = calculateLevelProgress(level);
                const isButtonActive = activeButtonIndex === index;
                
                return (
                  <div key={level.id} className="flex items-stretch gap-4">
                    {/* Level name and badges container */}
                    <div className="relative flex-shrink-0 w-24 flex items-center">
                      <div className="relative w-full">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xl px-4 py-2 font-bold bg-transparent shadow-none whitespace-nowrap z-10 min-w-[4rem] text-center flex justify-center items-center border-0",
                            isDimmed ? "text-muted-foreground" : "text-foreground"
                          )}
                        >
                          {level.name}
                        </Badge>
                        
                        {isComplete && (
                          <div className="absolute right-0 -top-1 bg-green-50 dark:bg-green-900/40 rounded-full p-1 shadow-sm border border-green-100 dark:border-green-800">
                            <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        
                        {isDimmed && (
                          <div className="absolute right-0 -top-1 bg-background rounded-full p-1 shadow-sm border">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Level card */}
                    <Card
                      className={cn(
                        "p-4 relative overflow-hidden group transition-all duration-300 opacity-0 translate-y-4 flex-1 shadow-md dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)]",
                        isDimmed
                          ? "border-l-4 border-l-gray-500/30 dark:border-l-gray-600/50 border-t border-t-gray-200/40 dark:border-t-gray-700/30 border-r border-r-gray-200/40 dark:border-r-gray-700/30 border-b border-b-gray-200/40 dark:border-b-gray-700/30 bg-background dark:bg-background"
                          : [
                              "dark:border-[#5271FF]/15",
                              isActive
                                ? "border-l-4 border-l-[#5271FF] dark:border-l-[#5271FF]"
                                : isComplete
                                ? "border-l-4 border-l-green-600 dark:border-l-green-500"
                                : "border-l-4 border-l-primary/40 dark:border-l-primary/80"
                            ]
                      )}
                      style={{
                        animation: isVisible ? `slideIn 0.6s ease-out ${index * 0.1}s forwards` : 'none',
                        minHeight: '120px'
                      }}
                    >
                      {/* Background decoration */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-r transition-opacity duration-300",
                        isActive ? "from-gray-100/40 to-transparent dark:from-gray-800/10 opacity-100" :
                        isComplete ? "from-gray-100/40 to-transparent dark:from-gray-800/10 opacity-100" :
                        isDimmed ? "from-gray-100/10 to-transparent dark:from-gray-800/10 dark:to-transparent opacity-100" :
                        "from-primary/5 to-transparent bg-gray-50/30 dark:bg-primary/5 opacity-40"
                      )} />
                      
                      <div className="relative flex flex-row justify-between">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr flex-1 mr-4">
                          {level.topics?.map((topic) => {
                            const topicProgress = calculateTopicProgress(topic);
                            const isTopicComplete = topicProgress === 100;
                            
                            return (
                              <div
                                key={topic.id}
                                className={cn(
                                  "relative rounded-lg transition-all duration-300",
                                  "hover:scale-[1.01] flex flex-col",
                                  "cursor-pointer h-full",
                                  isDimmed ? (
                                    "bg-background dark:bg-background dark:border-transparent"
                                  ) : (
                                    isActive 
                                    ? "bg-background dark:bg-background shadow-sm" 
                                    : isComplete 
                                    ? "bg-background dark:bg-background shadow-sm"
                                    : "bg-background dark:bg-background shadow-sm"
                                  )
                                )}
                                style={{
                                  boxShadow: isDimmed 
                                    ? '0 1px 2px rgba(0,0,0,0.02)' 
                                    : isActive 
                                      ? '0 2px 4px rgba(0,0,0,0.04)' 
                                      : isComplete 
                                        ? '0 2px 4px rgba(0,0,0,0.04)' 
                                        : '0 2px 4px rgba(0,0,0,0.04)',
                                  overflow: 'hidden',
                                  transition: 'box-shadow 0.3s ease, transform 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  const target = e.currentTarget;
                                  const isDarkMode = document.documentElement.classList.contains('dark');
                                  
                                  if (isDarkMode) {
                                    const color = isActive 
                                      ? 'rgba(82, 113, 255, 0.2)'
                                      : isComplete 
                                        ? 'rgba(22, 163, 74, 0.2)'
                                        : isDimmed 
                                          ? 'rgba(75, 85, 99, 0.2)'
                                          : 'rgba(82, 113, 255, 0.2)';
                                    
                                    target.style.boxShadow = `0 0 10px 1px ${color}`;
                                  } else {
                                    // Subtle shadow for light mode
                                    target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const target = e.currentTarget;
                                  const defaultShadow = isDimmed 
                                    ? '0 1px 2px rgba(0,0,0,0.02)' 
                                    : '0 2px 4px rgba(0,0,0,0.04)';
                                  
                                  target.style.boxShadow = defaultShadow;
                                }}
                                onClick={() => handleTopicClick(topic)}
                              >
                                <div className={cn(
                                  "p-3 rounded-lg",
                                  isDimmed 
                                    ? "bg-gradient-to-br from-white/80 to-gray-50/40 dark:from-gray-800/10 dark:to-gray-900/5" 
                                    : "bg-gradient-to-br from-white to-gray-50/50 dark:from-primary/5 dark:to-transparent"
                                )}>
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 
                                      className={cn(
                                        "text-lg font-semibold transition-colors duration-300",
                                        isDimmed ? (
                                          "text-muted-foreground group-hover:text-muted-foreground"
                                        ) : (
                                          "text-foreground/90 group-hover:text-primary"
                                        )
                                      )}
                                    >
                                      {topic.name}
                                    </h3>
                                    
                                    {isTopicComplete && !isDimmed && (
                                      <div className="rounded-full bg-green-50 dark:bg-green-900/30 p-1">
                                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="mt-auto w-full">
                                    <ProgressBar progress={topicProgress} dimmed={isDimmed} />
                                    
                                    <div className="flex justify-between items-center mt-2">
                                      <span className={cn(
                                        "text-xs text-muted-foreground"
                                      )}>
                                        {topicProgress}%
                                      </span>
                                      
                                      <ChevronRight className={cn(
                                        "w-4 h-4 opacity-50",
                                        isDimmed ? "text-muted-foreground" : "text-primary"
                                      )} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Level Exam Button - Inside Card */}
                        <div 
                          className="relative flex-shrink-0 w-24 h-24 perspective-[800px] overflow-visible"
                          ref={el => buttonRefs.current[`level-${level.id}`] = el}
                        >
                          <div className={cn(
                            "absolute inset-0 w-full h-full rotate-button cursor-pointer overflow-visible",
                            activeButtonIndex === index ? "active" : ""
                          )}>
                            {/* Front side - Graduation Cap icon */}
                            <div 
                              className={cn(
                                "absolute inset-0 flex flex-col items-center justify-center backface-hidden rounded-lg",
                                "bg-white dark:bg-card shadow-sm dark:shadow-[0_0_2px_rgba(159,159,255,0.15)]" +
                                (activeButtonIndex !== index ? " hover:scale-[1.01] transition-transform duration-300" : ""),
                                isDimmed && !isComplete && "ring-2 ring-primary/40 dark:ring-primary/30" // Highlight if this unlocks next level
                              )}
                              style={{
                                boxShadow: activeButtonIndex === index
                                  ? '0 2px 4px rgba(0,0,0,0.04)' // Reset to default if flipped
                                  : '0 2px 4px rgba(0,0,0,0.04)',
                                overflow: 'visible', // Changed from 'hidden' to 'visible' to allow badge to show
                                transition: 'box-shadow 0.3s ease, transform 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                // Only apply hover effect if not flipped
                                if (activeButtonIndex !== index) {
                                  const target = e.currentTarget;
                                  const isDarkMode = document.documentElement.classList.contains('dark');
                                  
                                  if (isDarkMode) {
                                    const color = isActive 
                                      ? 'rgba(82, 113, 255, 0.2)'
                                      : isComplete 
                                        ? 'rgba(22, 163, 74, 0.2)'
                                        : isDimmed 
                                          ? 'rgba(75, 85, 99, 0.2)'
                                          : 'rgba(82, 113, 255, 0.2)';
                                    
                                    target.style.boxShadow = `0 0 10px 1px ${color}`;
                                  } else {
                                    // Match topic boxes shadow in light mode
                                    target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                  }
                                }
                              }}
                              onMouseLeave={(e) => {
                                // Only reset if not flipped
                                if (activeButtonIndex !== index) {
                                  const target = e.currentTarget;
                                  target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                                }
                              }}
                              onClick={(e) => handleButtonClick(index, e)}
                            >
                              <div className={cn(
                                "flex flex-col items-center justify-center w-full h-full p-2 rounded-lg",
                                "bg-gradient-to-br from-white via-blue-50/5 to-gray-50/30 dark:from-blue-900/5 dark:via-primary/3 dark:to-transparent"
                              )}>
                                <GraduationCap className="h-8 w-8 mb-2 text-foreground/90 dark:text-foreground" />
                                <span className="text-xs font-medium text-foreground dark:text-foreground">Level Exam</span>
                                {isDimmed && !isComplete && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-[#5271FF] dark:bg-[#5271FF] backdrop-blur-sm text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-md border-0 flex items-center text-white z-50 translate-y-0.5 translate-x-0.5">
                                    {level.name === "L7" ? "Unlocks ??" : `Unlocks L${parseInt(level.name.replace(/\D/g, "")) + 1}`}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Back side - Dual button */}
                            <div className={cn(
                              "absolute inset-0 flex flex-col rounded-lg overflow-hidden shadow-sm backface-hidden rotate-y-180",
                              "bg-white dark:bg-card shadow-sm dark:shadow-[0_0_2px_rgba(159,159,255,0.15)]"
                            )}
                            style={{
                              boxShadow: activeButtonIndex === index
                                ? (!document.documentElement.classList.contains('dark') ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : '0 2px 4px rgba(0,0,0,0.04)') 
                                : '0 2px 4px rgba(0,0,0,0.04)',
                              overflow: 'hidden' // Ensure content doesn't break rounded corners
                            }}>
                              {/* Take Exam */}
                              <button 
                                className={cn(
                                  "relative flex flex-col items-center justify-center p-2 h-1/2 text-xs font-medium transition-colors",
                                  isLoadingTest ? "bg-transparent" : "bg-primary/5 hover:bg-primary/10 text-foreground dark:text-foreground"
                                )}
                                onClick={(e) => handleStartNextTest(level.id, level.name, e)}
                                disabled={isLoadingTest}
                              >
                                {isLoadingTest ? (
                                  <LoadingSpinner size="sm" className="text-current" />
                                ) : (
                                  <>
                                    <FileText className={cn(
                                      "h-4 w-4 mb-1"
                                    )} />
                                    Take Exam
                                  </> 
                                )}
                              </button>
                              
                              {/* Divider */}
                              <div className="h-px w-full bg-border" />
                              
                              {/* See History */}
                              <button 
                                className={cn(
                                  "flex flex-col items-center justify-center p-2 h-1/2 text-xs font-medium transition-colors",
                                  "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={(e) => handleTestHistory(level, e)}
                                disabled={false} // Explicitly false
                              >
                                <History className={cn(
                                  "h-4 w-4 mb-1"
                                )} />
                                See History
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })
            ) : (
              // Show message if loading is finished but there are no levels
              !loading && (
                <div className="text-center text-muted-foreground py-8">
                  No learning path levels found.
                </div>
              )
            )}
          </div>
        ) : (
          <div className="md:hidden"> {/* Mobile view - hidden on md and up */} 
            <Accordion type="single" collapsible className="w-full space-y-4">
              {Array.isArray(levels) && levels.length > 0 ? (
                levels.map((level, index) => {
                  const isDimmed = shouldDimLevel(index);
                  const isActive = currentLevelIndex === index;
                  const isComplete = isLevelCompleted(level);
                  const levelProgress = calculateLevelProgress(level);
                  // const isButtonActive = activeButtonIndex === index; // Retain for potential internal logic if needed

                  return (
                    <AccordionItem value={`level-${level.id}`} key={level.id} className="border-none">
                      <AccordionTrigger
                        className={cn(
                          "flex justify-between items-center p-4 rounded-lg transition-all duration-300 cursor-pointer",
                          "data-[state=open]:rounded-b-none data-[state=open]:border-b-0", // Common styles for open state shape
                          isDimmed
                            ? "bg-muted/60 dark:bg-card/80 border-l-4 border-l-gray-500/30 dark:border-l-gray-600/50 shadow-sm" // Dimmed state: background is static
                            : [ // Array of styles for non-dimmed states
                                isComplete
                                  ? "bg-green-500/10 dark:bg-green-500/20 border-l-4 border-l-green-600 dark:border-l-green-500 shadow-md" // Complete state
                                  // Unlocked and not complete (covers isActive and default unlocked/incomplete)
                                  : cn(
                                      "bg-card dark:bg-muted shadow-md dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)]", 
                                      isActive 
                                        ? "border-l-4 border-l-primary dark:border-l-primary" // Active: specific border
                                        : "border-l-4 border-l-primary/40 dark:border-l-primary/80" // Default unlocked/incomplete: specific border
                                    ),
                                "hover:bg-muted/80 dark:hover:bg-muted/50" // Hover styles only for non-dimmed items
                              ]
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-lg px-3 py-1 font-bold bg-transparent shadow-none border-0",
                              isDimmed ? "text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {level.name}
                          </Badge>
                          <div className="flex flex-col items-start">
                            <span className={cn("font-semibold text-sm", isDimmed ? "text-muted-foreground" : "text-foreground")}>
                            </span>
                            <ProgressBar progress={levelProgress} dimmed={isDimmed} />
                          </div>
                        </div>
                        {/* Chevron is automatically added by AccordionTrigger, but we can customize if needed */}
                      </AccordionTrigger>
                      <AccordionContent 
                        className={cn(
                          "p-4 rounded-b-lg", // Borders removed, padding and bottom rounding kept.
                          isDimmed 
                            ? "bg-muted/30 dark:bg-card/60" // Dimmed content background
                            : isComplete
                            ? "bg-green-500/5 dark:bg-green-500/10" // Complete content background
                            // Unlocked and not complete (covers isActive and default unlocked/incomplete)
                            : "bg-primary/5 dark:bg-primary/10", // Consistent background for all unlocked, non-complete levels
                          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                        )}
                      >
                        {/* Content of the level: topics and exam button */}
                        <div className="grid gap-4 sm:grid-cols-2 auto-rows-fr">
                          {level.topics?.map((topic) => {
                            const topicProgress = calculateTopicProgress(topic);
                            const isTopicComplete = topicProgress === 100;
                            return (
                              <div
                                key={topic.id}
                                className={cn(
                                  "relative rounded-lg transition-all duration-300 p-3 flex flex-col justify-between",
                                  "hover:scale-[1.01] cursor-pointer h-full shadow-sm",
                                  isDimmed
                                    ? "bg-white/70 dark:bg-muted/50"
                                    : "bg-white dark:bg-muted/20"
                                )}
                                onClick={() => handleTopicClick(topic)}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <h3 
                                    className={cn(
                                      "text-base font-semibold",
                                      isDimmed ? "text-muted-foreground" : "text-foreground/90 group-hover:text-primary"
                                    )}
                                  >
                                    {topic.name}
                                  </h3>
                                  {isTopicComplete && !isDimmed && (
                                    <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-0.5">
                                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-auto w-full">
                                  <ProgressBar progress={topicProgress} dimmed={isDimmed} />
                                  <div className="flex justify-between items-center mt-1.5">
                                    <span className="text-xs text-muted-foreground">
                                      {topicProgress}%
                                    </span>
                                    <ChevronRight 
                                      className={cn("w-3.5 h-3.5 opacity-60", isDimmed ? "text-muted-foreground" : "text-primary")} 
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Level Exam Button - simplified for mobile accordion content */}
                        {!isDimmed && (
                          <div 
                            className="mt-4 perspective-[800px]"
                            ref={el => buttonRefs.current[`mobile-level-${level.id}`] = el} // Ensure unique ref keys if needed
                          >
                            <div className={cn(
                              "relative w-full rotate-button cursor-pointer", // Removed h-24, let content define height
                              activeButtonIndex === index ? "active" : ""
                            )}>
                              {/* Front side */}
                              <div 
                                className={cn(
                                  "flex flex-col items-center justify-center p-3 rounded-lg backface-hidden",
                                  "bg-background dark:bg-muted shadow-md hover:shadow-lg transition-shadow",
                                  isDimmed && "opacity-70"
                                )}
                                onClick={(e) => handleButtonClick(index, e)}
                              >
                                <GraduationCap className="h-6 w-6 mb-1.5 text-foreground/90" />
                                <span className="text-sm font-medium text-foreground">Level Exam</span>
                              </div>
                              
                              {/* Back side */}
                              <div className={cn(
                                "absolute inset-0 flex flex-row rounded-lg overflow-hidden shadow-md backface-hidden rotate-y-180",
                                "bg-background dark:bg-muted"
                              )}>
                                {/* Take Exam Button - now on the left */}
                                <button 
                                  className={cn(
                                    "flex flex-grow items-center justify-center gap-2 p-3 text-sm font-medium transition-colors",
                                    isLoadingTest ? "bg-transparent text-foreground" : "hover:bg-primary/10 text-foreground"
                                  )}
                                  onClick={(e) => handleStartNextTest(level.id, level.name, e)}
                                  disabled={isLoadingTest}
                                >
                                  {isLoadingTest ? (
                                    <LoadingSpinner size="sm" className="text-current" />
                                  ) : <FileText className="w-4 h-4" />}
                                  Take Exam
                                </button>
                                {/* Vertical Divider */}
                                <div className="w-px h-full bg-border" /> 
                                {/* See History Button - now on the right */}
                                <button 
                                  className={cn(
                                    "flex flex-grow items-center justify-center gap-2 p-3 text-sm font-medium transition-colors",
                                    "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                  )}
                                  onClick={(e) => handleTestHistory(level, e)}
                                >
                                  <History className="w-4 h-4" />
                                  See History
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              ) : (
                !loading && (
                  <div className="text-center text-muted-foreground py-8">
                    No learning path levels found.
                  </div>
                )
              )}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
} 