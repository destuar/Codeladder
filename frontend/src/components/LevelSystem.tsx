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
import { Lock } from "lucide-react";

function ProgressBar({ progress = 0, dimmed = false }: { progress?: number, dimmed?: boolean }) {
  return (
    <div className={cn(
      "w-full h-2 bg-primary/10 rounded-full overflow-hidden mt-2",
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

  const handleTopicClick = (topicId: string) => {
    navigate(`/topics/${topicId}`);
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

  return (
    <div className="space-y-2">
      {/* <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              style={{ fontFamily: "'Patrick Hand', cursive" }}>
            Learning Path System
          </h2>
          <p className="text-muted-foreground mt-2 text-lg" style={{ fontFamily: "'Patrick Hand', cursive" }}>
            Structured progression through programming concepts
          </p>
        </div>
      </div> */}

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
        `}
      </style>

      <div className="grid gap-8">
        {Array.isArray(levels) && levels.length > 0 ? (
          levels.map((level, index) => {
            const isDimmed = shouldDimLevel(index);
            return (
              <Card 
                key={level.id} 
                className={cn(
                  "p-6 relative overflow-hidden group transition-all duration-300 opacity-0 translate-y-4",
                  isDimmed ? "bg-muted/50" : "hover:shadow-lg",
                )}
                style={{
                  animation: isVisible ? `slideIn 0.6s ease-out ${index * 0.1}s forwards` : 'none',
                }}
              >
                {/* Background decoration */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300",
                  !isDimmed && "group-hover:opacity-100"
                )} />
                
                <div className="relative flex items-start gap-6">
                  <div className="relative">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-2xl px-4 py-2 font-bold bg-background shadow-sm",
                        isDimmed && "border-muted-foreground text-muted-foreground"
                      )}
                      style={{ fontFamily: "'Patrick Hand', cursive" }}
                    >
                      {level.name}
                    </Badge>
                    {isDimmed && (
                      <div className="absolute -right-3 -top-3 bg-background rounded-full p-1 shadow-sm border">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {level.topics?.map((topic) => (
                        <div
                          key={topic.id}
                          className={cn(
                            "relative rounded-lg border bg-card p-4 transition-all duration-300",
                            "hover:shadow-md hover:scale-[1.02] flex flex-col items-center justify-center",
                            "cursor-pointer",
                            isDimmed ? (
                              "border-muted hover:border-muted-foreground/50 bg-muted/50"
                            ) : (
                              "hover:border-primary/50"
                            )
                          )}
                          onClick={() => handleTopicClick(topic.id)}
                        >
                          <h3 
                            className={cn(
                              "text-xl font-semibold mb-4 text-center transition-colors duration-300",
                              isDimmed ? (
                                "text-muted-foreground group-hover:text-muted-foreground"
                              ) : (
                                "text-foreground/90 group-hover:text-primary"
                              )
                            )}
                            style={{ fontFamily: "'Patrick Hand', cursive" }}
                          >
                            {topic.name}
                          </h3>
                          <ProgressBar progress={calculateTopicProgress(topic)} dimmed={isDimmed} />
                        </div>
                      ))}
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