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
        console.error("Expected levelsData to be an array, got:", levelsData);
        return []; // Return empty array if data format is unexpected
      }

      // Optionally, log to confirm tests are present
      levelsData.forEach(level => {
        console.log(`Level: ${level.name}, Tests:`, level.tests?.length || 0);
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
    
    const isCompleted = isLevelCompleted(level);
    const isDimmed = shouldDimLevel(levels?.findIndex(l => l.id === level.id) || 0);
    
    // Prevent viewing history for locked levels
    if (isDimmed && !isCompleted) {
      toast({
        title: "Level locked",
        description: `Complete previous levels before viewing test history for ${level.name}.`,
        variant: "destructive"
      });
      return;
    }
    
    console.log("Navigating to test history for level:", level.id);
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

    // Check for locked level (copied from existing logic)
    const isCompleted = isLevelCompleted(levels?.find(l => l.id === levelId) || {} as Level);
    const isDimmed = shouldDimLevel(levels?.findIndex(l => l.id === levelId) || 0);
    if (isDimmed && !isCompleted) {
      toast({
        title: "Level locked",
        description: `Complete previous levels before accessing tests for ${levelName}.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoadingTest(true);
    try {
      // Fetch the response object containing the ID
      const response = await api.getNextTestForLevel(levelId, token);
      // Extract the actual ID string
      const nextTestId = response?.nextAssessmentId;

      if (nextTestId) {
        console.log(`Navigating to next test ID: ${nextTestId} for level ${levelId}`);
        navigate(`/assessment/test/${nextTestId}`, { state: { levelId, levelName } });
      } else {
        console.log(`No next test available for level ${levelId} (${levelName}).`);
      }
    } catch (error) { // Catch potential errors from the API call itself
      console.error("Error fetching next test:", error);
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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
      "space-y-6 transition-opacity duration-300 relative",
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
          
          .level-connector {
            position: absolute;
            width: 3px;
            background: linear-gradient(to bottom, #e2e8f0, #94a3b8);
            z-index: -1;
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

      <div className="relative grid gap-6">
        {/* Level connectors - the vertical line connecting levels */}
        <div className="level-connector absolute left-[7.5rem] top-2 bottom-2"></div>
        
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
                    "p-4 relative overflow-hidden group transition-all duration-300 opacity-0 translate-y-4 flex-1",
                    isDimmed 
                      ? "border-l-4 border-l-gray-500/30 dark:border-l-gray-600/50 border-t border-t-gray-200/40 dark:border-t-gray-700/30 border-r border-r-gray-200/40 dark:border-r-gray-700/30 border-b border-b-gray-200/40 dark:border-b-gray-700/30 bg-muted/50 dark:bg-card/70" 
                      : isActive 
                      ? "hover:shadow-md hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 border-l-4 border-l-blue-400 dark:border-l-blue-500 border-t-0 border-r-0 border-b-0 dark:border-blue-800/20" 
                      : isComplete 
                      ? "hover:shadow-md hover:shadow-green-200/50 dark:hover:shadow-green-900/30 border-l-4 border-l-green-600 dark:border-l-green-500 border-t-0 border-r-0 border-b-0 dark:border-green-900/20" 
                      : "hover:shadow-md hover:shadow-primary/30 dark:hover:shadow-primary/20 border-l-4 border-l-primary/40 dark:border-l-primary/80 border-t border-t-gray-100 dark:border-t-primary/20 border-r border-r-gray-100 dark:border-r-primary/20 border-b border-b-gray-100 dark:border-b-primary/20 dark:shadow-[0_0_1px_1px_rgba(159,159,255,0.1)]"
                  )}
                  style={{
                    animation: isVisible ? `slideIn 0.6s ease-out ${index * 0.1}s forwards` : 'none',
                    minHeight: '120px',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Background decoration */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-r transition-opacity duration-300",
                    isActive ? "from-gray-100/40 to-transparent dark:from-gray-800/10 opacity-100" : 
                    isComplete ? "from-gray-100/40 to-transparent dark:from-gray-800/10 opacity-100" : 
                    isDimmed ? "from-gray-100/10 to-transparent dark:from-gray-800/10 dark:to-transparent opacity-100" :
                    "from-primary/5 to-transparent bg-gray-50/30 dark:bg-primary/5 opacity-40 group-hover:opacity-100"
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
                                "bg-white/50 dark:bg-card/70 dark:border-transparent"
                              ) : (
                                isActive 
                                ? "bg-white dark:bg-card shadow-sm" 
                                : isComplete 
                                ? "bg-white dark:bg-card shadow-sm"
                                : "bg-white dark:bg-card shadow-sm"
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
                                // Reduce glow intensity to match exam button
                                const color = isActive 
                                  ? 'rgba(59, 130, 246, 0.2)' // blue
                                  : isComplete 
                                    ? 'rgba(22, 163, 74, 0.2)' // green
                                    : isDimmed 
                                      ? 'rgba(75, 85, 99, 0.2)' // gray
                                      : 'rgba(147, 51, 234, 0.2)'; // primary (purple)
                                
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
                                // Match topic box glow exactly for this level type
                                const color = isActive 
                                  ? 'rgba(59, 130, 246, 0.2)' // blue - active level
                                  : isComplete 
                                    ? 'rgba(22, 163, 74, 0.2)' // green - completed level
                                    : isDimmed 
                                      ? 'rgba(75, 85, 99, 0.2)' // gray - locked level
                                      : 'rgba(147, 51, 234, 0.2)'; // primary - regular level
                                
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
                              <div className="absolute -top-1.5 -right-1.5 bg-blue-500 dark:bg-gradient-to-r dark:from-blue-600 dark:to-blue-500 backdrop-blur-sm text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-md border-0 flex items-center text-white z-50 translate-y-0.5 translate-x-0.5">
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
                              isDimmed && !isComplete 
                                ? "bg-gray-100 dark:bg-gray-800/40 text-muted-foreground cursor-not-allowed"
                                : "bg-primary/5 hover:bg-primary/10 text-foreground dark:text-foreground"
                            )}
                            onClick={(e) => handleStartNextTest(level.id, level.name, e)}
                            disabled={(isDimmed && !isComplete) || isLoadingTest}
                          >
                            {isLoadingTest ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                              </div>
                            ) : (
                              <>
                                <FileText className={cn(
                                  "h-4 w-4 mb-1",
                                  isDimmed && !isComplete ? "text-muted-foreground" : ""
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
                              isDimmed && !isComplete 
                                ? "bg-gray-100 dark:bg-gray-800/40 text-muted-foreground cursor-not-allowed"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                            onClick={(e) => handleTestHistory(level, e)}
                            disabled={isDimmed && !isComplete}
                          >
                            <History className={cn(
                              "h-4 w-4 mb-1",
                              isDimmed && !isComplete ? "text-muted-foreground/50" : ""
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
    </div>
  );
} 