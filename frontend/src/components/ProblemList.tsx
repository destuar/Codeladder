import { useState } from 'react';
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
import { ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, Circle, Book, Code2, Timer, Lock, PlayCircle, RepeatIcon } from "lucide-react";
import { cn } from '@/lib/utils';
import { Problem, Topic } from '@/hooks/useLearningPath';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSpacedRepetition } from '@/features/spaced-repetition/hooks/useSpacedRepetition';
import { SpacedRepetitionPanel } from '@/features/spaced-repetition/components/SpacedRepetitionPanel';
import { Difficulty, SortField, SortDirection, DIFFICULTY_ORDER } from '@/features/problems/types';

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

export interface ProblemListProps {
  problems: Problem[];
  isLocked?: boolean;
  canAccessAdmin?: boolean;
  onProblemStart?: (id: string, slug?: string) => void;
  itemsPerPage?: number;
  showTopicName?: boolean;
  showOrder?: boolean;
  collections?: Collection[];
  selectedCollection?: string;
  onCollectionChange?: (value: string) => void;
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
}: ProblemListProps) {
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    toggleReviewPanel, 
    isReviewPanelOpen,
    stats
  } = useSpacedRepetition();

  const nextProblem = problems
    .filter(p => !p.completed && p.required)
    .sort((a, b) => (a.reqOrder || Infinity) - (b.reqOrder || Infinity))[0];

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
    <div className="space-y-8">
      {collections?.length > 0 && onCollectionChange && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium">Filter by collection:</span>
          <Select 
            value={selectedCollection} 
            onValueChange={onCollectionChange}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Problems</SelectItem>
              {collections.map(collection => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Button to view collection page if available */}
          {selectedCollection !== 'all' && selectedCollection && (
            <Link 
              to={`/collection/${collections.find(c => c.id === selectedCollection)?.slug || ''}`}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                "h-9 px-4 py-2"
              )}
            >
              View Collection
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          className={cn(
            "h-32 flex flex-col items-center justify-center gap-2 border-2",
            nextProblem ? "hover:border-primary" : "opacity-50 cursor-not-allowed"
          )}
          disabled={!nextProblem || isLocked}
          onClick={() => nextProblem && onProblemStart(nextProblem.id, nextProblem.slug)}
        >
          <PlayCircle className="h-8 w-8" />
          <div className="text-center">
            <div className="font-semibold">Continue</div>
            {nextProblem ? (
              <div className="text-sm text-muted-foreground mt-1">
                {nextProblem.name}
                {nextProblem.reqOrder && ` (#${nextProblem.reqOrder})`}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-1">All problems completed!</div>
            )}
          </div>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-32 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary"
          onClick={toggleReviewPanel}
        >
          <RepeatIcon className="h-8 w-8" />
          <div className="text-center">
            <div className="font-semibold">Spaced Repetition</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats?.dueNow 
                ? `${stats.dueNow} problem${stats.dueNow !== 1 ? 's' : ''} due for review` 
                : 'Review completed problems'}
            </div>
          </div>
        </Button>
      </div>
      
      {isReviewPanelOpen && <SpacedRepetitionPanel />}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn("w-4", isLocked && "text-muted-foreground")} />
            {showOrder && (
              <TableHead 
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors pl-2",
                  isLocked && "text-muted-foreground"
                )}
                onClick={() => handleSort('order')}
              >
                <div className="flex items-center">
                  <span>Order</span>
                  {sortField === 'order' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="h-4 w-4 ml-1 text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />
                  )}
                </div>
              </TableHead>
            )}
            <TableHead 
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                isLocked && "text-muted-foreground"
              )}
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center space-x-1">
                <span>Name</span>
                {sortField === 'name' ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </TableHead>
            {showTopicName && (
              <TableHead className={cn(isLocked && "text-muted-foreground")}>Topic</TableHead>
            )}
            <TableHead 
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                isLocked && "text-muted-foreground"
              )}
              onClick={() => handleSort('difficulty')}
            >
              <div className="flex items-center space-x-1">
                <span>Difficulty</span>
                {sortField === 'difficulty' ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </TableHead>
            <TableHead className={cn("w-[100px]", isLocked && "text-muted-foreground")}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(isLocked && "opacity-50")}>
          {paginatedProblems.map((problem) => (
            <TableRow key={problem.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                {problem.completed ? (
                  <CheckCircle2 className={cn("h-5 w-5 text-green-500", isLocked && "text-muted-foreground")} />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </TableCell>
              {showOrder && (
                <TableCell>
                  {problem.required ? (
                    <Badge variant="outline" className={cn(isLocked && "border-muted-foreground text-muted-foreground")}>
                      REQ {problem.reqOrder}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className={cn(isLocked && "bg-muted text-muted-foreground")}>
                      {problem.reqOrder ? `OPT ${problem.reqOrder}` : 'STANDALONE'}
                    </Badge>
                  )}
                </TableCell>
              )}
              <TableCell className={cn("font-medium", isLocked && "text-muted-foreground")}>
                <div className="flex items-center gap-2">
                  {problem.problemType === 'INFO' ? (
                    <Book className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  {problem.name}
                </div>
              </TableCell>
              {showTopicName && (
                <TableCell className={cn(isLocked && "text-muted-foreground")}>
                  {problem.topic?.name || 'Standalone'}
                </TableCell>
              )}
              <TableCell>
                <DifficultyBadge difficulty={problem.difficulty || 'MEDIUM' as Difficulty} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      isLocked && !canAccessAdmin && "border-muted-foreground text-muted-foreground",
                      isLocked && canAccessAdmin && "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                    )}
                    onClick={() => onProblemStart(problem.id, problem.slug)}
                  >
                    {isLocked && canAccessAdmin ? "Start (Admin)" : "Start"}
                  </Button>
                  {problem.estimatedTime && (
                    <div className="flex items-center gap-1">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatEstimatedTime(parseEstimatedTime(problem.estimatedTime))}
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
} 