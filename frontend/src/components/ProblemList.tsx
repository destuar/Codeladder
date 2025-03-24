import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2, Timer, Lock, X } from "lucide-react";
import { cn } from '@/lib/utils';
import { Problem, Topic } from '@/hooks/useLearningPath';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Difficulty, SortField, SortDirection, ProblemListProps, DIFFICULTY_ORDER } from '@/features/problems/types';

const formatEstimatedTime = (time?: number) => {
  if (!time) return null;
  if (time < 60) return `${time}m`;
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const DifficultyBadge = ({ difficulty }: { difficulty: Difficulty }) => {
  const getColor = () => {
    switch (difficulty) {
      case 'EASY_IIII':
      case 'EASY_III':
      case 'EASY_II':
      case 'EASY_I':
        return 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20';
      case 'HARD':
        return 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/20';
      default:
        return '';
    }
  };

  return (
    <Badge variant="outline" className={cn("font-medium transition-colors", getColor())}>
      {difficulty.replace(/_/g, ' ')}
    </Badge>
  );
};

// Helper function to convert estimatedTime to number when needed
const parseEstimatedTime = (time?: string | number): number | undefined => {
  if (time === undefined) return undefined;
  if (typeof time === 'number') return time;
  return parseInt(time, 10);
};

// Update the Collection interface to include slug
interface Collection {
  id: string;
  name: string;
  slug?: string;
}

// Enhanced ProblemListProps interface to include filter props
interface EnhancedProblemListProps extends ProblemListProps {
  difficulties?: string[];
  selectedDifficulty?: string;
  onDifficultyChange?: (value: string) => void;
  resetFilters?: () => void;
  formatDifficultyLabel?: (difficulty: string) => string;
  hideHeader?: boolean;
}

export function ProblemList({
  problems,
  isLocked = false,
  canAccessAdmin = false,
  onProblemStart,
  itemsPerPage = 50,
  showTopicName = false,
  showOrder = false,
  collections = [],
  selectedCollection = 'all',
  onCollectionChange,
  difficulties = [],
  selectedDifficulty = 'all',
  onDifficultyChange,
  resetFilters,
  formatDifficultyLabel = (d: string) => String(d).replace(/_/g, ' '),
  hideHeader = false,
}: EnhancedProblemListProps) {
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedProblems = () => {
    if (!problems) return [];
    
    return [...problems].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'difficulty':
          return direction * (DIFFICULTY_ORDER[a.difficulty as Difficulty] - DIFFICULTY_ORDER[b.difficulty as Difficulty]);
        case 'order':
          const aOrder = a.reqOrder || Infinity;
          const bOrder = b.reqOrder || Infinity;
          return direction * (aOrder - bOrder);
        case 'completed':
          return direction * (Number(a.completed) - Number(b.completed));
        default:
          return 0;
      }
    });
  };

  const sortedProblems = getSortedProblems();
  const totalPages = Math.ceil(sortedProblems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProblems = sortedProblems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="mt-2 mb-8">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {!hideHeader && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <div className="h-6 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                Problem List
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-3">
                Browse and practice all available problems across topics
              </p>
            </div>
          )}
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {collections?.length > 0 && onCollectionChange && (
              <>
                <div className="flex items-center">
                  <Select 
                    value={selectedCollection} 
                    onValueChange={onCollectionChange}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-blue-500/30 bg-background border-border/40">
                      <SelectValue placeholder="Collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Collections</SelectItem>
                      {collections.map(collection => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {difficulties?.length > 0 && onDifficultyChange && (
              <div className="flex items-center">
                <Select 
                  value={selectedDifficulty} 
                  onValueChange={onDifficultyChange}
                >
                  <SelectTrigger className="w-[180px] h-9 focus:ring-blue-500/30 bg-background border-border/40">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {formatDifficultyLabel(difficulty)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {resetFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="h-9 w-9 p-0 flex items-center justify-center bg-background border border-border/40 hover:bg-muted/20"
                aria-label="Reset filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 bg-background border border-border/40 hover:bg-muted/20 disabled:opacity-50"
                >
                  Previous
                </Button>
                <span className="text-sm px-3 py-1 bg-background border border-border/40 rounded-md">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 bg-background border border-border/40 hover:bg-muted/20 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Table className="w-full border-collapse">
        <TableHeader className="bg-transparent">
          <TableRow className="hover:bg-transparent border-0 border-b border-border/20">
            <TableHead className={cn("w-4 pl-6", isLocked && "text-muted-foreground")} />
            {showOrder && (
              <TableHead 
                className={cn(
                  "cursor-pointer group hover:text-foreground transition-colors pl-4",
                  isLocked && "text-muted-foreground"
                )}
                onClick={() => handleSort('order')}
              >
                <div className="flex items-center">
                  <span className="group-hover:font-medium transition-colors">Order</span>
                  {sortField === 'order' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </TableHead>
            )}
            <TableHead 
              className={cn(
                "cursor-pointer group hover:text-foreground transition-colors",
                isLocked && "text-muted-foreground"
              )}
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                <span className="group-hover:font-medium transition-colors">Name</span>
                {sortField === 'name' ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                )}
              </div>
            </TableHead>
            {showTopicName && (
              <TableHead className={cn(isLocked && "text-muted-foreground")}>Topic</TableHead>
            )}
            <TableHead 
              className={cn(
                "cursor-pointer group hover:text-foreground transition-colors",
                isLocked && "text-muted-foreground"
              )}
              onClick={() => handleSort('difficulty')}
            >
              <div className="flex items-center">
                <span className="group-hover:font-medium transition-colors">Difficulty</span>
                {sortField === 'difficulty' ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                )}
              </div>
            </TableHead>
            <TableHead className={cn("w-[120px] pr-6", isLocked && "text-muted-foreground")}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(isLocked && "opacity-50")}>
          {paginatedProblems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showOrder ? 5 : 4} className="text-center py-10 text-muted-foreground">
                No problems available
              </TableCell>
            </TableRow>
          ) : (
            paginatedProblems.map((problem, index) => (
              <TableRow 
                key={problem.id} 
                className={cn(
                  "transition-colors border-b border-border/10",
                  "hover:bg-blue-50/20 dark:hover:bg-blue-900/5",
                  index % 2 === 0 ? "bg-muted/10 dark:bg-muted/15" : ""
                )}
              >
                <TableCell className="pl-6 py-3">
                  {problem.completed ? (
                    <CheckCircle2 className={cn("h-5 w-5 text-green-500", isLocked && "text-muted-foreground")} />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </TableCell>
                {showOrder && (
                  <TableCell className="pl-4">
                    {problem.required ? (
                      <Badge variant="outline" className={cn("bg-blue-50/50 dark:bg-blue-900/20", isLocked && "text-muted-foreground")}>
                        REQ {problem.reqOrder}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className={cn("bg-muted/50", isLocked && "bg-muted text-muted-foreground")}>
                        {problem.reqOrder ? `OPT ${problem.reqOrder}` : 'STANDALONE'}
                      </Badge>
                    )}
                  </TableCell>
                )}
                <TableCell className={cn("font-medium", isLocked && "text-muted-foreground")}>
                  <span className="flex items-center gap-2">
                    {problem.problemType === 'INFO' ? (
                      <Book className={cn("h-4 w-4", "text-amber-500 dark:text-amber-400")} />
                    ) : (
                      <Code2 className={cn("h-4 w-4", "text-indigo-500 dark:text-indigo-400")} />
                    )}
                    <span className="line-clamp-1">{problem.name}</span>
                  </span>
                </TableCell>
                {showTopicName && (
                  <TableCell className={cn(isLocked && "text-muted-foreground")}>
                    {problem.topic?.name || 'Standalone'}
                  </TableCell>
                )}
                <TableCell>
                  <DifficultyBadge difficulty={problem.difficulty || 'MEDIUM' as Difficulty} />
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={cn(
                        "px-3 py-1 h-8 transition-all",
                        "bg-transparent hover:bg-blue-50/70 text-blue-600 border border-blue-200/70",
                        "dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20",
                        isLocked && !canAccessAdmin && "text-muted-foreground border-muted/50",
                        isLocked && canAccessAdmin && "text-yellow-500 border-yellow-200 hover:bg-yellow-50/20 dark:border-yellow-800/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProblemStart(problem.id, problem.slug);
                      }}
                    >
                      {isLocked && canAccessAdmin ? "Start (Admin)" : "Start"}
                    </Button>
                    {problem.estimatedTime && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          {formatEstimatedTime(parseEstimatedTime(problem.estimatedTime))}
                        </span>
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 