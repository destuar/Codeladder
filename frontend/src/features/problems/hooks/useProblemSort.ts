import { useState, useMemo } from 'react';
import { Problem, SortField, SortDirection, DIFFICULTY_ORDER } from '../types';

interface UseProblemSortResult {
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  sortedProblems: Problem[];
}

/**
 * Custom hook for managing problem list sorting
 */
export function useProblemSort(problems: Problem[]): UseProblemSortResult {
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProblems = useMemo(() => {
    if (!problems) return [];
    
    return [...problems].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'difficulty':
          return direction * (DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
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
  }, [problems, sortField, sortDirection]);

  return {
    sortField,
    sortDirection,
    handleSort,
    sortedProblems,
  };
} 