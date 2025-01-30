import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Topic {
  name: string;
  description?: string;
}

interface Level {
  level: string;
  topics: Topic[];
}

const levels: Level[] = [
  {
    level: "I",
    topics: [
      { name: "Methodology", description: "Programming fundamentals and best practices" },
      { name: "Syntax", description: "Language syntax and basic constructs" }
    ]
  },
  {
    level: "L3",
    topics: [
      { name: "Arrays", description: "Array manipulation and algorithms" }
    ]
  },
  {
    level: "L4",
    topics: [
      { name: "Hashing", description: "Hash tables and collision resolution" },
      { name: "Linked List", description: "Singly and doubly linked lists" }
    ]
  },
  {
    level: "L5",
    topics: [
      { name: "Stack/Queue", description: "LIFO and FIFO data structures" },
      { name: "Binary Search", description: "Search algorithms and implementations" },
      { name: "Binary Tree", description: "Tree traversal and operations" }
    ]
  },
  {
    level: "L6",
    topics: [
      { name: "Backtracking", description: "Recursive problem-solving strategies" },
      { name: "Tries", description: "Prefix trees and string operations" }
    ]
  },
  {
    level: "L7",
    topics: [
      { name: "Heap/Priority Queue", description: "Priority-based data structures" },
      { name: "Graphs", description: "Graph algorithms and traversals" },
      { name: "Dynamic Programming", description: "Optimization and memoization" }
    ]
  }
];

export function LevelSystem() {
  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Learning Path System
          </h2>
          <p className="text-muted-foreground mt-2">
            Structured progression through programming concepts
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {levels.map((level) => (
          <Card 
            key={level.level} 
            className="p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex items-start gap-6">
              <Badge 
                variant="outline" 
                className="text-lg px-4 py-2 font-bold bg-background shadow-sm"
              >
                {level.level}
              </Badge>

              <div className="flex-1">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {level.topics.map((topic) => (
                    <div
                      key={topic.name}
                      className="relative rounded-lg border bg-card p-4 transition-all duration-300
                        hover:shadow-md hover:scale-[1.02] hover:border-primary/50"
                    >
                      <h3 className="font-semibold mb-2 text-foreground/90 group-hover:text-primary transition-colors duration-300">
                        {topic.name}
                      </h3>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {topic.description}
                        </p>
                      )}
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