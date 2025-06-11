import { cn } from "@/lib/utils";

interface ParameterDisplayProps {
  name: string;
  value: any;
}

export function ParameterDisplay({ name, value }: ParameterDisplayProps) {
  // Primitives (string, number, boolean, null) and arrays should be on a single line.
  // Only complex objects should be multi-line.
  const isMultiLine = typeof value === 'object' && value !== null && !Array.isArray(value);
  const isSingleLine = !isMultiLine;

  const formattedValue = isSingleLine
    ? JSON.stringify(value)
    : JSON.stringify(value, null, 2);

  const containerClasses = cn(
    "bg-muted/50 rounded-md p-3 dark:border-transparent border border-border"
  );

  const preClasses = cn(
    "text-sm whitespace-pre-wrap",
    !isSingleLine && "break-all"
  );
  
  const nameClasses = "text-xs text-muted-foreground font-mono";

  if (isSingleLine) {
    return (
      <div className="flex items-center space-x-2">
        <div className={nameClasses}>{name} =</div>
        <div className={containerClasses}>
          <pre className={preClasses}>{formattedValue}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className={nameClasses}>{name} =</div>
      <div className={containerClasses}>
        <pre className={preClasses}>{formattedValue}</pre>
      </div>
    </div>
  );
} 