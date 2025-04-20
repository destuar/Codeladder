import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";
import { Check, X, Clock, AlertCircle, Code, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

// Define the submission type
interface Submission {
  id: string;
  language: string;
  status: string;
  executionTime?: number;
  memory?: number;
  passed: boolean;
  submittedAt: string;
}

interface SubmissionDetailsProps {
  submission: Submission | null;
  isLoading: boolean;
}

// Component for submission details dialog
function SubmissionDetails({ submission, isLoading }: SubmissionDetailsProps) {
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (submission && token) {
      setLoadingDetails(true);
      api.getSubmissionDetails(submission.id, token)
        .then(data => {
          setDetails(data);
        })
        .catch(error => {
          console.error("Error fetching submission details:", error);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [submission, token]);

  if (isLoading || loadingDetails) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load submission details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold">Status</h3>
          <div className="flex items-center space-x-2 mt-1">
            {details.passed ? (
              <>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-1">
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
                </span>
                <span className="text-emerald-600 dark:text-emerald-500 font-medium">Accepted</span>
              </>
            ) : (
              <>
                <span className="rounded-full bg-red-100 dark:bg-red-900/30 p-1">
                  <X className="h-3 w-3 text-red-600 dark:text-red-500" />
                </span>
                <span className="text-red-600 dark:text-red-500 font-medium">Failed</span>
              </>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Language</h3>
          <p className="mt-1 text-sm">{details.language}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Runtime</h3>
          <p className="mt-1 text-sm">{details.executionTime ? `${details.executionTime} ms` : 'N/A'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Memory</h3>
          <p className="mt-1 text-sm">{details.memory ? `${details.memory} KB` : 'N/A'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Submitted</h3>
          <p className="mt-1 text-sm">
            {details.submittedAt 
              ? format(new Date(details.submittedAt), "MMM d, yyyy h:mm a") 
              : 'N/A'}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Code</h3>
        <div className="bg-muted p-4 rounded-md overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">{details.code}</pre>
        </div>
      </div>

      {details.results && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Results</h3>
          {Array.isArray(details.results) ? (
            <div className="space-y-4">
              {details.results.map((result: any, index: number) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                    <div className="flex items-center">
                      {result.passed ? (
                        <span className="text-xs py-0.5 px-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">Passed</span>
                      ) : (
                        <span className="text-xs py-0.5 px-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">Failed</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Only show input and expected/actual output if the test case failed */}
                  {!result.passed && (
                    <>
                      {result.input && (
                        <div className="mb-2">
                          <h5 className="text-xs font-medium mb-1">Input</h5>
                          <div className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(result.input)}
                          </div>
                        </div>
                      )}
                      
                      {result.expected && (
                        <div className="mb-2">
                          <h5 className="text-xs font-medium mb-1">Expected</h5>
                          <div className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(result.expected)}
                          </div>
                        </div>
                      )}
                      
                      {result.actual && (
                        <div>
                          <h5 className="text-xs font-medium mb-1">Output</h5>
                          <div className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(result.actual)}
                          </div>
                        </div>
                      )}
                      
                      {result.error && (
                        <div className="mt-2">
                          <h5 className="text-xs font-medium mb-1">Error</h5>
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs font-mono text-red-700 dark:text-red-400 overflow-x-auto">
                            {result.error}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-md">
              <pre className="text-sm overflow-x-auto">{JSON.stringify(details.results, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {details.error && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Error</h3>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-700 dark:text-red-400">
            <pre className="text-sm font-mono whitespace-pre-wrap">{details.error}</pre>
          </div>
        </div>
      )}

      {details.compileOutput && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Compilation Output</h3>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm font-mono whitespace-pre-wrap">{details.compileOutput}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Status Icon component
function StatusIcon({ submission }: { submission: Submission }) {
  if (submission.status === 'PENDING' || submission.status === 'PROCESSING') {
    return <Clock className="h-4 w-4 text-blue-500" />;
  } else if (submission.passed) {
    return <Check className="h-4 w-4 text-emerald-500" />;
  } else if (submission.status === 'ERROR' || submission.status === 'TIMEOUT') {
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  } else {
    return <X className="h-4 w-4 text-red-500" />;
  }
}

// Status Text component
function StatusText({ submission }: { submission: Submission }) {
  if (submission.status === 'PENDING') {
    return <span className="text-blue-500">Pending</span>;
  } else if (submission.status === 'PROCESSING') {
    return <span className="text-blue-500">Processing</span>;
  } else if (submission.passed) {
    return <span className="text-emerald-500">Accepted</span>;
  } else if (submission.status === 'ERROR') {
    return <span className="text-amber-500">Error</span>;
  } else if (submission.status === 'TIMEOUT') {
    return <span className="text-amber-500">Timeout</span>;
  } else {
    return <span className="text-red-500">Runtime Error</span>;
  }
}

// Main SubmissionsTab component
export function SubmissionsTab({ problemId }: { problemId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { token } = useAuth();

  // Fetch submissions on component mount
  useEffect(() => {
    if (!problemId || !token) return;
    
    setLoading(true);
    api.getProblemSubmissions(problemId, token)
      .then(data => {
        setSubmissions(data);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching submissions:", err);
        setError("Failed to load submissions. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [problemId, token]);

  // Handle dialog open/close
  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Submissions</h2>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Submissions</h2>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-4 text-amber-800 dark:text-amber-400">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Submissions</h2>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-1">No submissions yet</p>
            <p className="text-sm">Submit your solution to see your results here</p>
          </div>
        ) : (
          <div className="overflow-hidden border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="text-right">Runtime</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon submission={submission} />
                        <StatusText submission={submission} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm" title={format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}>
                        {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">{submission.language}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm tabular-nums">{submission.executionTime ? `${submission.executionTime} ms` : 'N/A'}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm tabular-nums">{submission.memory ? `${submission.memory} KB` : 'N/A'}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={dialogOpen && selectedSubmission?.id === submission.id} onOpenChange={(open) => {
                        if (!open) setSelectedSubmission(null);
                        setDialogOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Submission Detail</DialogTitle>
                            <DialogDescription>
                              Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}
                            </DialogDescription>
                          </DialogHeader>
                          <SubmissionDetails submission={selectedSubmission} isLoading={false} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
} 