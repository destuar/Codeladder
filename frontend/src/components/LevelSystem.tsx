import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import type { Topic, Problem, Level } from "@/hooks/useLearningPath";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";
import { Lock, Check, ChevronRight, Award, Star } from "lucide-react";

function ProgressBar({ progress = 0, dimmed = false }: { progress?: number, dimmed?: boolean }) {
  return (
    <div className={cn(
      "w-full h-2.5 bg-primary/10 rounded-full overflow-hidden mt-2",
      dimmed && "opacity-50"
    )}>
      <div 
        className={cn(
          "h-full bg-primary transition-all duration-500 ease-out rounded-full",
          dimmed && "bg-muted-foreground"
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
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: levels, isLoading: loading, error } = useQuery<Level[]>({
    queryKey: ['learningPath'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return api.get('/learning/levels', token);
    },
    enabled: !!token,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

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

  // Check if a level should be dimmed
  const shouldDimLevel = (currentIndex: number) => {
    if (!levels) return false;
    // First level is never dimmed
    if (currentIndex === 0) return false;
    
    // Check if all previous levels are completed
    for (let i = 0; i < currentIndex; i++) {
      if (!isLevelCompleted(levels[i])) {
        return true;
      }
    }
    return false;
  };

  const handleTopicClick = (topic: Topic) => {
    if (topic.slug) {
      navigate(`/topic/${topic.slug}`);
    } else {
      navigate(`/topics/${topic.id}`);
    }
  };

  if (loading) {
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

  const currentLevelIndex = findCurrentLevelIndex();

  return (
    <div className="space-y-6">
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
        `}
      </style>

      <div className="relative grid gap-6 pl-3">
        {/* Level connectors - the vertical line connecting levels */}
        <div className="level-connector absolute left-[3.25rem] top-2 bottom-2"></div>
        
        {Array.isArray(levels) && levels.length > 0 ? (
          levels.map((level, index) => {
            const isDimmed = shouldDimLevel(index);
            const isActive = currentLevelIndex === index;
            const isComplete = isLevelCompleted(level);
            const levelProgress = calculateLevelProgress(level);
            
            return (
              <Card 
                key={level.id} 
                className={cn(
                  "p-4 relative overflow-hidden group transition-all duration-300 opacity-0 translate-y-4",
                  isDimmed ? "bg-muted/50 border-muted" : 
                  isActive ? "hover:shadow-sm border-l-4 border-l-blue-400 dark:border-l-blue-600 border-t-0 border-r-0 border-b-0 dark:border-blue-800/20" : 
                  isComplete ? "hover:shadow-sm border-l-4 border-l-green-400 dark:border-l-green-600 border-t-0 border-r-0 border-b-0 dark:border-green-900/20" : 
                  "hover:shadow-sm border-l-4 border-l-gray-200 dark:border-l-gray-700 border-t-0 border-r-0 border-b-0",
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
                  "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300",
                  isActive ? "from-blue-50/50 to-transparent dark:from-blue-950/10" : 
                  isComplete ? "from-green-50/30 to-transparent dark:from-green-950/5" : 
                  "from-primary/5 to-transparent",
                  !isDimmed && "group-hover:opacity-100"
                )} />
                
                <div className="relative flex items-start gap-8">
                  <div className="relative flex-shrink-0 mt-1" style={{ width: "80px" }}>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xl px-4 py-2 font-bold bg-transparent shadow-none whitespace-nowrap z-10 min-w-[4rem] text-center flex justify-center items-center border-0",
                        isDimmed ? "text-muted-foreground" : 
                        isComplete ? "text-green-700 dark:text-green-400" : 
                        isActive ? "text-foreground dark:text-foreground" : 
                        ""
                      )}
                    >
                      {level.name}
                    </Badge>
                    
                    {isComplete && (
                      <div className="absolute -right-2 -top-2 bg-green-100 dark:bg-green-900/40 rounded-full p-1 shadow-sm border border-green-200 dark:border-green-800">
                        <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    
                    {isDimmed && (
                      <div className="absolute -right-2 -top-2 bg-background rounded-full p-1 shadow-sm border">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    {!isDimmed && isComplete && (
                      <div className="mb-4 flex justify-end items-center">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                          <Star className="w-4 h-4 fill-green-500 stroke-green-600 dark:fill-green-700 dark:stroke-green-500" />
                          <span>Completed</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                      {level.topics?.map((topic) => {
                        const topicProgress = calculateTopicProgress(topic);
                        const isTopicComplete = topicProgress === 100;
                        
                        return (
                          <div
                            key={topic.id}
                            className={cn(
                              "relative rounded-lg transition-all duration-300",
                              "hover:shadow-sm hover:scale-[1.01] flex flex-col",
                              "cursor-pointer h-full",
                              isDimmed ? (
                                "border-0 bg-muted/30"
                              ) : isTopicComplete ? (
                                "bg-green-50/30 dark:bg-green-950/5 border-0"
                              ) : (
                                "bg-card border-0"
                              )
                            )}
                            style={{
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            onClick={() => handleTopicClick(topic)}
                          >
                            <div className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <h3 
                                  className={cn(
                                    "text-lg font-semibold transition-colors duration-300",
                                    isDimmed ? (
                                      "text-muted-foreground group-hover:text-muted-foreground"
                                    ) : isTopicComplete ? (
                                      "text-green-700 dark:text-green-400"
                                    ) : (
                                      "text-foreground/90 group-hover:text-primary"
                                    )
                                  )}
                                >
                                  {topic.name}
                                </h3>
                                
                                {isTopicComplete && !isDimmed && (
                                  <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1">
                                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-auto w-full">
                                <ProgressBar progress={topicProgress} dimmed={isDimmed} />
                                
                                <div className="flex justify-between items-center mt-2">
                                  <span className={cn(
                                    "text-xs",
                                    isDimmed ? "text-muted-foreground" :
                                    isTopicComplete ? "text-green-600 dark:text-green-400" :
                                    "text-muted-foreground"
                                  )}>
                                    {topicProgress}% complete
                                  </span>
                                  
                                  <ChevronRight className={cn(
                                    "w-4 h-4 opacity-50",
                                    isDimmed ? "text-muted-foreground" :
                                    isTopicComplete ? "text-green-500" :
                                    "text-primary"
                                  )} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No levels found
          </div>
        )}
      </div>
    </div>
  );
} 