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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Path System</h2>
          <p className="text-muted-foreground">Structured progression through programming concepts</p>
        </div>
      </div>

      <div className="grid gap-6">
        {levels.map((level) => (
          <Card key={level.level} className="p-6">
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {level.level}
              </Badge>
              <div className="flex-1">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {level.topics.map((topic) => (
                    <div
                      key={topic.name}
                      className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <h3 className="font-semibold mb-1">{topic.name}</h3>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground">
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