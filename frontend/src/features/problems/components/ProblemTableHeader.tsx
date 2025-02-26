import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from '@/lib/utils';
import { SortDirection, SortField } from '../types';

interface ProblemTableHeaderProps {
  isLocked: boolean;
  showOrder: boolean;
  showTopicName: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

/**
 * Renders the problem table header with sorting functionality
 */
export function ProblemTableHeader({
  isLocked,
  showOrder,
  showTopicName,
  sortField,
  sortDirection,
  onSort,
}: ProblemTableHeaderProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="h-4 w-4 text-primary" />
      ) : (
        <ChevronDown className="h-4 w-4 text-primary" />
      );
    }
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        isLocked && "text-muted-foreground"
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  return (
    <TableHeader>
      <TableRow>
        <TableHead className={cn("w-4", isLocked && "text-muted-foreground")} />
        {showOrder && (
          <SortableHeader field="order">Order</SortableHeader>
        )}
        <SortableHeader field="name">Name</SortableHeader>
        {showTopicName && (
          <TableHead className={cn(isLocked && "text-muted-foreground")}>Topic</TableHead>
        )}
        <SortableHeader field="difficulty">Difficulty</SortableHeader>
        <TableHead className={cn("w-[100px]", isLocked && "text-muted-foreground")}>Action</TableHead>
      </TableRow>
    </TableHeader>
  );
} 