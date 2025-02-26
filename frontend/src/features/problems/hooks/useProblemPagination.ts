import { useState, useMemo } from 'react';
import { Problem } from '../types';

interface UseProblemPaginationResult {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginatedProblems: Problem[];
}

/**
 * Custom hook for managing problem list pagination
 */
export function useProblemPagination(
  problems: Problem[],
  itemsPerPage: number = 50
): UseProblemPaginationResult {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(problems.length / itemsPerPage);

  const paginatedProblems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return problems.slice(startIndex, startIndex + itemsPerPage);
  }, [problems, currentPage, itemsPerPage]);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProblems,
  };
} 