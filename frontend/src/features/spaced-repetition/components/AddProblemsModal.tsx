import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Search, X, RepeatIcon, Code2, Filter, Loader2 } from "lucide-react";
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';

interface Problem {
  id: string;
  name: string;
  difficulty: string;
  topic?: {
    id: string;
    name: string;
  };
}

interface AddProblemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddProblemsModal({ isOpen, onClose }: AddProblemsModalProps) {
  const { getAvailableProblems, addCompletedProblem, isAddingProblem } = useSpacedRepetition();
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | 'all'>('all');
  const [topics, setTopics] = useState<{id: string, name: string}[]>([]);
  const [addingProblemIds, setAddingProblemIds] = useState<Set<string>>(new Set());

  // Load available problems when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProblems();
    }
  }, [isOpen]);

  // Filter problems when search query or selected topic changes
  useEffect(() => {
    if (!availableProblems.length) return;
    
    let filtered = [...availableProblems];
    
    // Apply topic filter
    if (selectedTopicId !== 'all') {
      filtered = filtered.filter(problem => 
        problem.topic && problem.topic.id === selectedTopicId
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(problem => 
        problem.name.toLowerCase().includes(query) ||
        problem.topic?.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredProblems(filtered);
  }, [searchQuery, selectedTopicId, availableProblems]);

  // Extract unique topics from problems
  useEffect(() => {
    if (!availableProblems.length) return;
    
    const topicMap = new Map<string, {id: string, name: string}>();
    
    availableProblems.forEach(problem => {
      if (problem.topic) {
        topicMap.set(problem.topic.id, problem.topic);
      }
    });
    
    setTopics(Array.from(topicMap.values()));
  }, [availableProblems]);

  const loadProblems = async () => {
    setIsLoading(true);
    try {
      const problems = await getAvailableProblems();
      setAvailableProblems(problems);
      setFilteredProblems(problems);
    } catch (error) {
      console.error('Error loading available problems:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProblem = async (problemId: string) => {
    setAddingProblemIds(prev => new Set(prev).add(problemId));
    try {
      await addCompletedProblem(problemId);
      // Remove the added problem from both lists
      const updatedProblems = availableProblems.filter(p => p.id !== problemId);
      setAvailableProblems(updatedProblems);
      setFilteredProblems(prev => prev.filter(p => p.id !== problemId));
    } catch (error) {
      console.error('Error adding problem:', error);
    } finally {
      setAddingProblemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(problemId);
        return newSet;
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty.includes('EASY')) return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20';
    if (difficulty === 'MEDIUM') return 'bg-amber-500/15 text-amber-600 border-amber-500/20';
    if (difficulty === 'HARD') return 'bg-rose-500/15 text-rose-600 border-rose-500/20';
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <RepeatIcon className="h-5 w-5" />
            Add Problems to Spaced Repetition
          </DialogTitle>
          <DialogDescription>
            Select completed problems to add to your spaced repetition dashboard
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 my-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search problems..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="absolute right-2 top-2.5"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          
          <div className="relative">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
            >
              <option value="all">All Topics</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
            <Filter className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Loading problems...</span>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {availableProblems.length === 0 ? (
                <>
                  <p className="text-lg font-medium">No problems available</p>
                  <p className="mt-2">All of your completed coding problems are already in spaced repetition</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No matching problems</p>
                  <p className="mt-2">Try a different search or filter</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="w-[120px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProblems.map(problem => (
                  <TableRow key={problem.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                        {problem.name}
                      </div>
                    </TableCell>
                    <TableCell>{problem.topic?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
                        {problem.difficulty.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-primary"
                        onClick={() => handleAddProblem(problem.id)}
                        disabled={addingProblemIds.has(problem.id)}
                      >
                        {addingProblemIds.has(problem.id) ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <RepeatIcon className="h-3 w-3" />
                            Add
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 