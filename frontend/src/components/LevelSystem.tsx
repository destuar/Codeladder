import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLearningPath } from "@/hooks/useLearningPath";
import { Button } from "./ui/button";

function ProgressBar({ progress = 0 }: { progress?: number }) {
  return (
    <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden mt-2">
      <div 
        className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
        style={{ 
          width: `${progress}%`,
          boxShadow: progress > 0 ? '0 0 8px rgba(var(--primary), 0.3)' : 'none'
        }}
      />
    </div>
  );
}

export function LevelSystem() {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { levels, loading, error } = useLearningPath();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    console.log('Levels data:', levels);
  }, [levels]);

  const handleTopicClick = (topicId: string) => {
    navigate(`/topics/${topicId}`);
  };

  if (loading) {
    console.log('Loading state:', loading);
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    console.log('Error state:', error);
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  console.log('Rendering levels:', levels);

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
          levels.map((level, index) => (
            <Card 
              key={level.id} 
              className="p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300 opacity-0 translate-y-4"
              style={{
                animation: isVisible ? `slideIn 0.6s ease-out ${index * 0.1}s forwards` : 'none',
              }}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-start gap-6">
                <Badge 
                  variant="outline" 
                  className="text-2xl px-4 py-2 font-bold bg-background shadow-sm"
                  style={{ fontFamily: "'Patrick Hand', cursive" }}
                >
                  {level.name}
                </Badge>

                <div className="flex-1">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {level.topics?.map((topic) => (
                      <div
                        key={topic.id}
                        className="relative rounded-lg border bg-card p-4 transition-all duration-300
                          hover:shadow-md hover:scale-[1.02] hover:border-primary/50 flex flex-col items-center justify-center
                          cursor-pointer"
                        onClick={() => handleTopicClick(topic.id)}
                      >
                        <h3 
                          className="text-xl font-semibold mb-4 text-center text-foreground/90 group-hover:text-primary transition-colors duration-300"
                          style={{ fontFamily: "'Patrick Hand', cursive" }}
                        >
                          {topic.name}
                        </h3>
                        <ProgressBar progress={0} /> {/* We'll implement progress tracking later */}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No levels found
          </div>
        )}
      </div>
    </div>
  );
} 