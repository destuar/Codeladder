import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface Topic {
  name: string;
  progress?: number; // 0 to 100
}

interface Level {
  level: string;
  topics: Topic[];
}

const levels: Level[] = [
  {
    level: "I",
    topics: [
      { name: "Methodology", progress: 0 },
      { name: "Syntax", progress: 0 }
    ]
  },
  {
    level: "L3",
    topics: [
      { name: "Arrays", progress: 0 }
    ]
  },
  {
    level: "L4",
    topics: [
      { name: "Hashing", progress: 0 },
      { name: "Linked List", progress: 0 }
    ]
  },
  {
    level: "L5",
    topics: [
      { name: "Stack/Queue", progress: 0 },
      { name: "Binary Search", progress: 0 },
      { name: "Binary Tree", progress: 0 }
    ]
  },
  {
    level: "L6",
    topics: [
      { name: "Backtracking", progress: 0 },
      { name: "Tries", progress: 0 }
    ]
  },
  {
    level: "L7",
    topics: [
      { name: "Heap/Priority Queue", progress: 0 },
      { name: "Graphs", progress: 0 },
      { name: "Dynamic Programming", progress: 0 }
    ]
  }
];

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

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
        {levels.map((level, index) => (
          <Card 
            key={level.level} 
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
                {level.level}
              </Badge>

              <div className="flex-1">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {level.topics.map((topic) => (
                    <div
                      key={topic.name}
                      className="relative rounded-lg border bg-card p-4 transition-all duration-300
                        hover:shadow-md hover:scale-[1.02] hover:border-primary/50 flex flex-col items-center justify-center"
                    >
                      <h3 
                        className="text-xl font-semibold mb-4 text-center text-foreground/90 group-hover:text-primary transition-colors duration-300"
                        style={{ fontFamily: "'Patrick Hand', cursive" }}
                      >
                        {topic.name}
                      </h3>
                      <ProgressBar progress={topic.progress} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 