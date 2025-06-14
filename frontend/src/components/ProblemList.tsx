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
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2, Timer, Lock, X, Shuffle, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { Problem, Topic } from '@/hooks/useLearningPath';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Difficulty, SortField, SortDirection, ProblemListProps, DIFFICULTY_ORDER } from '@/features/problems/types';
import { DifficultyBadge } from '@/features/problems/components/DifficultyBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const formatEstimatedTime = (time?: number) => {
  if (!time) return null;
  if (time < 60) return `${time}m`;
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
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
  onShuffleClick?: () => void;
  isShuffling?: boolean;
  shuffleDisabled?: boolean;
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
  onShuffleClick,
  isShuffling,
  shuffleDisabled,
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
          return direction * (Number(a.isCompleted) - Number(b.isCompleted));
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
    <div className="mb-6">
      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {!hideHeader && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <div className="h-6 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                Category List
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-3">
                Browse and practice all available problems across categories
              </p>
            </div>
          )}
          
          {/* Filters */}
          <div className="w-full flex flex-wrap items-center gap-3">
            {onShuffleClick && (
              <Button
                variant="ghost"
                onClick={onShuffleClick}
                className="h-9 px-3 bg-background hover:bg-muted/20 disabled:opacity-50 shadow-md flex items-center gap-1.5 font-sans text-sm font-medium"
                disabled={shuffleDisabled || isShuffling}
              >
                {isShuffling ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Shuffle className="h-4 w-4" />
                    <span className="sm:hidden text-sm">Shuffle</span>
                    <span className="hidden sm:inline text-sm">Shuffle</span>
                  </>
                )}
              </Button>
            )}
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
                  className="h-8 px-3 bg-background hover:bg-muted/20 disabled:opacity-50 shadow-md"
                >
                  Previous
                </Button>
                <span className="text-sm px-3 py-1 bg-background rounded-md">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 bg-background hover:bg-muted/20 disabled:opacity-50 shadow-md"
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
                  "cursor-pointer group hover:text-foreground transition-colors pl-4 text-xs sm:text-sm font-sans",
                  isLocked && "text-muted-foreground"
                )}
                onClick={() => handleSort('order')}
              >
                <div className="flex items-center">
                  <span className="group-hover:font-medium transition-colors">Order</span>
                  {sortField === 'order' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-blue-500 dark:text-blue-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </TableHead>
            )}
            <TableHead 
              className={cn(
                "cursor-pointer group hover:text-foreground transition-colors text-xs sm:text-sm font-sans",
                isLocked && "text-muted-foreground"
              )}
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                <span className="group-hover:font-medium transition-colors">Name</span>
                {sortField === 'name' ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                )}
              </div>
            </TableHead>
            {showTopicName && (
              <TableHead className={cn("text-xs sm:text-sm py-2 sm:py-3", isLocked && "text-muted-foreground")}>Topic</TableHead>
            )}
            <TableHead 
              className={cn(
                "cursor-pointer group hover:text-foreground transition-colors text-xs sm:text-sm py-2 sm:py-3 font-sans w-[70px] sm:w-auto",
                isLocked && "text-muted-foreground"
              )}
              onClick={() => handleSort('difficulty')}
            >
              <div className="flex items-center">
                <span className="group-hover:font-medium transition-colors">Difficulty</span>
                {sortField === 'difficulty' ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-blue-500 dark:text-blue-400" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                )}
              </div>
            </TableHead>
            <TableHead className={cn("w-[80px] sm:w-[120px] text-xs sm:text-sm pl-2 pr-2 sm:pl-0 sm:pr-6 py-2 sm:py-3", isLocked && "text-muted-foreground")}></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(isLocked && "opacity-50")}>
          {paginatedProblems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showOrder ? 5 : 4} className="text-center py-10 text-muted-foreground text-xs sm:text-sm">
                No problems available
              </TableCell>
            </TableRow>
          ) : (
            paginatedProblems.map((problem, index) => {
              const isProblemLocked = isLocked && !problem.isCompleted;
              const problemEstimatedTime = formatEstimatedTime(parseEstimatedTime(problem.estimatedTime));

              return (
                <TableRow 
                  key={problem.id} 
                  className={cn(
                    "font-sans border-0 border-b border-border/10",
                    isProblemLocked 
                      ? "bg-muted/20 hover:bg-muted/30 text-muted-foreground/60 cursor-not-allowed" 
                      : "hover:bg-muted/20",
                    index % 2 !== 0 && !isProblemLocked ? "bg-muted/10 dark:bg-muted/15" : "",
                    {
                      "transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-900/5": !isProblemLocked,
                    }
                  )}
                >
                  <TableCell className="w-4 pl-6 py-3">
                    {problem.isCompleted ? (
                      <CheckCircle2 className={cn("h-4 w-4 sm:h-5 sm:w-5 text-green-500", isProblemLocked && "text-muted-foreground")} />
                    ) : (
                      <Circle className={cn("h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/40")} />
                    )}
                  </TableCell>
                  {showOrder && (
                    <TableCell className="pl-2 sm:pl-4 py-2 sm:py-3 text-xs sm:text-sm">
                      {problem.required ? (
                        <Badge variant="outline" className={cn("bg-blue-50/50 dark:bg-blue-900/20 text-xs sm:text-sm border-transparent dark:border-transparent", isLocked && "text-muted-foreground")}>
                          REQ {problem.reqOrder}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className={cn("bg-muted/50 text-xs sm:text-sm text-slate-400 dark:text-slate-500", isLocked && "bg-muted text-muted-foreground")}>
                          {problem.reqOrder ? `OPT ${problem.reqOrder}` : 'STANDALONE'}
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell className={cn("font-medium py-2 sm:py-3", isLocked && "text-muted-foreground")}>
                    <span className="flex items-center gap-2">
                      {problem.problemType === 'INFO' ? (
                        <Book className={cn("h-4 w-4 flex-shrink-0", "text-amber-500 dark:text-amber-400")} />
                      ) : (
                        <Code2 className={cn("h-4 w-4 flex-shrink-0", "text-indigo-500 dark:text-indigo-400")} />
                      )}
                      <span className="line-clamp-1 text-sm">{problem.name}</span>
                    </span>
                  </TableCell>
                  {showTopicName && (
                    <TableCell className={cn("py-2 sm:py-3 text-xs sm:text-sm", isLocked && "text-muted-foreground")}>
                      {problem.topic?.name || 'Standalone'}
                    </TableCell>
                  )}
                  <TableCell className="py-2 sm:py-3 w-[70px] sm:w-auto">
                    <DifficultyBadge difficulty={problem.difficulty || 'MEDIUM' as Difficulty} size="small" />
                  </TableCell>
                  <TableCell className={cn("py-2 sm:py-3 pl-2 pr-2 sm:pl-0 sm:pr-6 w-[80px] sm:w-[120px]", isLocked && "text-muted-foreground")}>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "px-2 py-1 h-7 sm:px-3 sm:py-1 sm:h-8 transition-all text-xs sm:text-sm",
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
                        <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground">
                          <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="text-xs whitespace-nowrap">
                            {formatEstimatedTime(parseEstimatedTime(problem.estimatedTime))}
                          </span>
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
} 