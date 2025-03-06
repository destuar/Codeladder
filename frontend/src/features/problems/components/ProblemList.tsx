import { Table, TableBody } from "@/components/ui/table";
import { ProblemListProps } from '../types';
import { ProblemActionButtons } from './ProblemActionButtons';
import { ProblemTableHeader } from './ProblemTableHeader';
import { ProblemTableRow } from './ProblemTableRow';
import { useProblemSort } from '../hooks/useProblemSort';
import { useProblemPagination } from '../hooks/useProblemPagination';

/**
 * Main component for displaying the list of problems with sorting and pagination
 */
export function ProblemList({
  problems,
  isLocked = false,
  canAccessAdmin = false,
  onProblemStart,
  itemsPerPage = 50,
  showTopicName = false,
  showOrder = false,
}: ProblemListProps) {
  // Find the next problem to continue with (first incomplete required problem)
  const nextProblem = problems
    .filter(p => !p.completed && p.required)
    .sort((a, b) => (a.reqOrder || Infinity) - (b.reqOrder || Infinity))[0];

  const { 
    sortField, 
    sortDirection, 
    handleSort, 
    sortedProblems 
  } = useProblemSort(problems);

  const {
    paginatedProblems
  } = useProblemPagination(sortedProblems, itemsPerPage);

  return (
    <div className="space-y-8">
      <ProblemActionButtons
        nextProblem={nextProblem}
        isLocked={isLocked}
        onProblemStart={onProblemStart}
      />

      <Table>
        <ProblemTableHeader
          isLocked={isLocked}
          showOrder={showOrder}
          showTopicName={showTopicName}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        <TableBody className={isLocked ? "opacity-50" : undefined}>
          {paginatedProblems.map((problem) => (
            <ProblemTableRow
              key={problem.id}
              problem={problem}
              isLocked={isLocked}
              showOrder={showOrder}
              showTopicName={showTopicName}
              onProblemStart={onProblemStart}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 