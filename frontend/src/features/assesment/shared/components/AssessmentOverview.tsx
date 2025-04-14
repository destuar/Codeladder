import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, ArrowRight, Timer, CheckSquare, Code2, CheckCircle2, Circle, AlertTriangle, Tag, BookOpenCheck, XIcon, Send, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { BorderlessThemeToggle } from "@/features/problems/components/shared/BorderlessThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from '@/features/profile/ProfileContext';
import { useAuth } from '@/features/auth/AuthContext';
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';
import { useAssessmentTimer } from '../hooks/useAssessmentTimer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { clearAssessmentSession } from '@/lib/sessionUtils';

// Interface for task item in assessment
export interface AssessmentTask {
  id: string;
  title: string;
  type: string;
  score?: number;
  maxScore: number;
  isSubmitted?: boolean;
  isViewed?: boolean;
}

// Main component props
export interface AssessmentOverviewProps {
  id: string;
  title: string;
  description?: string;
  duration?: number; // in minutes
  tasks: AssessmentTask[];
  submittedCount?: number;
  remainingTime?: number; // in seconds
  type?: 'quiz' | 'test'; // extensible for future test type
  onStartTask?: (taskId: string) => void;
  onFinishAssessment?: () => void;
  onExit?: () => void; // This prop now triggers the dialog
  // Add props for lifted dialog state
  showExitDialog: boolean;
  onToggleExitDialog: (open: boolean) => void;
  onConfirmExit: () => void; // The actual exit/navigation logic
}

// Create a dedicated memoized component for the exit dialog
const ExitConfirmationDialog = React.memo(({
  open,
  onOpenChange,
  displayType,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayType: string;
  onConfirm: () => void;
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit {displayType}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to exit this {displayType.toLowerCase()}? You will lose any progress you may have made.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Exit {displayType}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// Simple AssessmentOverviewHeader component
const AssessmentOverviewHeader = React.memo(({ 
  title, 
  type, 
  onExitClick,
  onConfirmExit,
  showExitDialog,
  onToggleExitDialog,
  id
}: { 
  title: string, 
  type?: string, 
  onExitClick: () => void,
  onConfirmExit: () => void,
  showExitDialog: boolean,
  onToggleExitDialog: (open: boolean) => void,
  id?: string
}) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const logoSrc = useLogoSrc('single');
  
  // Normalize the type to proper case
  const displayType = type?.toUpperCase() === 'QUIZ' ? 'Quiz' : 
                      type?.toUpperCase() === 'TEST' ? 'Test' : 
                      type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Assessment';
  
  // Handle exit confirmation
  const handleExitConfirm = () => {
    // **Use the centralized cleanup function**
    if (id && type) {
      clearAssessmentSession(id, type as 'quiz' | 'test');
    }
    
    // Call the actual exit handler from parent
    onConfirmExit();
  };
  
  return (
    <div className="border-b bg-background py-3.5">
      <div className="flex items-center justify-between w-full px-0">
        {/* Left section - Exit button only */}
        <div className="flex items-center gap-2 pl-3">
          {/* CodeLadder logo */}
          <div className="mr-2">
            <img src={logoSrc} alt="CodeLadder Logo" className="h-12 w-auto" />
          </div>

          {/* Exit button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleExitDialog(true)}
            className="gap-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:border-red-800/50 dark:text-red-400"
          >
            <XIcon className="h-4 w-4 mr-1" />
            Exit
          </Button>
        </div>
        
        {/* Middle section - assessment type and topic name */}
        <div className="flex justify-center">
          <span className="text-base font-medium text-center my-1">
            {title} {displayType}
          </span>
        </div>

        {/* Right section - profile and theme toggle */}
        <div className="flex items-center justify-end gap-2 pr-3">
          <BorderlessThemeToggle />
          
          <Avatar className="h-8 w-8 transition-transform hover:scale-105">
            <AvatarImage src={profile?.avatarUrl} />
            <AvatarFallback>{user?.name?.[0] || user?.email?.[0]}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      {/* Use the extracted dialog component */}
      <ExitConfirmationDialog
        open={showExitDialog}
        onOpenChange={onToggleExitDialog}
        displayType={displayType}
        onConfirm={handleExitConfirm}
      />
    </div>
  );
});

export function AssessmentOverview({
  id,
  title,
  description,
  duration = 0,
  tasks = [],
  submittedCount = 0,
  remainingTime,
  type = 'quiz',
  onStartTask,
  onFinishAssessment,
  onExit,
  showExitDialog,
  onToggleExitDialog,
  onConfirmExit,
}: AssessmentOverviewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State to track locally with session persistence
  const [localSubmittedCount, setLocalSubmittedCount] = useState<number>(submittedCount);
  const [localTasks, setLocalTasks] = useState<AssessmentTask[]>(tasks);
  const [localIsSubmitting, setLocalIsSubmitting] = useState<boolean>(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState<boolean>(false);
  
  // Load assessment state from sessionStorage on initial render
  useEffect(() => {
    if (!id) return;

    const savedAssessment = sessionStorage.getItem(`assessment_${id}`);
    if (savedAssessment) {
      try {
        const assessmentData = JSON.parse(savedAssessment);
        
        // Restore tasks and submitted count
        if (assessmentData.tasks && assessmentData.tasks.length > 0) {
          setLocalTasks(assessmentData.tasks);
          // Count submitted tasks
          const submitted = assessmentData.tasks.filter((task: AssessmentTask) => task.isSubmitted).length;
          setLocalSubmittedCount(submitted);
        }
      } catch (e) {
        console.error('Error parsing saved assessment data:', e);
        // Clear invalid data
        sessionStorage.removeItem(`assessment_${id}`);
      }
    } else {
      // No saved data, initialize from props
      setLocalTasks(tasks);
      setLocalSubmittedCount(submittedCount);
      
      // Initialize session storage with current state
      saveAssessmentState(tasks, submittedCount);
    }
  }, [id]);
  
  // Save assessment state to sessionStorage
  const saveAssessmentState = (
    currentTasks: AssessmentTask[], 
    currentSubmittedCount: number
  ) => {
    if (!id) return;
    
    const assessmentData = {
      tasks: currentTasks,
      submittedCount: currentSubmittedCount,
      lastUpdated: new Date().toISOString()
    };
    
    sessionStorage.setItem(`assessment_${id}`, JSON.stringify(assessmentData));
  };
  
  // Format the remaining time as HH:MM:SS
  const formatRemainingTime = (seconds?: number): string => {
    if (seconds === undefined) return '--:--:--';
    if (seconds <= 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle starting a specific task
  const handleStartTask = (taskId: string) => {
    if (onStartTask) {
      onStartTask(taskId);
    } else {
      // Default behavior - navigate to the quiz/task
      if (type === 'quiz') {
        // Pass the taskId in state so the quiz knows which question to start with
        navigate(`/quizzes/${id}/take`, { 
          state: { 
            taskId: taskId,
            skipIntro: true 
          }
        });
      } else if (type === 'test') {
        // Same pattern for tests
        navigate(`/tests/${id}/take`, {
          state: {
            taskId: taskId,
            skipIntro: true
          }
        });
      }
    }
  };
  
  // Mark a task as viewed (separate from submission)
  const markTaskViewed = (taskId: string) => {
    const updatedTasks = localTasks.map(task =>
      task.id === taskId ? { ...task, isViewed: true } : task
    );
    
    setLocalTasks(updatedTasks);
    saveAssessmentState(updatedTasks, localSubmittedCount);
  };
  
  // Handle finishing the assessment
  const handleFinishAssessment = async () => {
    setLocalIsSubmitting(true);
    try {
      if (onFinishAssessment) {
        await onFinishAssessment();
      } else if (type === 'quiz') {
        // Default behavior for finishing - could navigate elsewhere
        navigate(`/topics`);
      }
      
      // Clear session storage when assessment is finished
      sessionStorage.removeItem(`assessment_${id}`);
    } catch (error) {
      console.error('Error finishing assessment:', error);
    } finally {
      setLocalIsSubmitting(false);
    }
  };

  // Calculate progress percentage
  const progressPercentage = localTasks.length > 0 ? (localSubmittedCount / localTasks.length) * 100 : 0;

  // Get icon based on question type
  const getTaskIcon = (taskType: string | undefined | null): React.ReactNode => {
    // Add check for undefined or null taskType
    if (!taskType) {
      // Return a default icon or null if type is missing
      console.warn('Task type is missing, returning default icon.');
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
    
    const lowerCaseType = taskType.toLowerCase();
    
    if (lowerCaseType.includes('multiple choice') || lowerCaseType.includes('mcq')) {
      return <CheckSquare className="h-4 w-4 text-amber-500" />;
    } else if (lowerCaseType.includes('code')) {
      return <Code2 className="h-4 w-4 text-indigo-500" />;
    }
    // Default icon if type is unrecognized
    console.warn(`Unrecognized task type: ${taskType}, returning default icon.`);
    return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Add the Assessment Header with type */}
      <AssessmentOverviewHeader 
        title={title} 
        type={type}
        onExitClick={onExit || (() => {})}
        onConfirmExit={onConfirmExit}
        showExitDialog={showExitDialog}
        onToggleExitDialog={onToggleExitDialog}
        id={id}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col gap-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Assessment Information */}
            <div className="lg:col-span-2 flex flex-col py-6">
              <div className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {title}
                    </h2>
                    {description && (
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="font-medium">
                    {type.toUpperCase()} Assessment
                  </Badge>
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Duration</span>
                    <div className="flex items-center mt-1">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                      <span className="font-medium text-sm">
                        {duration !== undefined ? `${duration} minutes` : 'Loading...'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Tasks</span>
                    <div className="flex items-center mt-1">
                      <BookOpenCheck className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                      <span className="font-medium text-sm">{localTasks.length} questions</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="font-medium text-sm">{localSubmittedCount}/{localTasks.length} completed</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>
            </div>
            
            {/* Timer Card */}
            <Card className="flex flex-col justify-center">
              <CardHeader className="text-center py-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Remaining Time</CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <div className="text-4xl font-mono font-bold tracking-wider pb-2 text-primary">
                  {formatRemainingTime(remainingTime)}
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <Button 
                    variant="outline"
                    size="default"
                    className="w-full transition-colors border-blue-300/70 hover:border-blue-500 hover:bg-blue-50/30 text-blue-600 dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    onClick={() => handleStartTask(localTasks[0]?.id || '')}
                  >
                    {progressPercentage > 0 ? 'Continue Assessment' : `Start ${type}`}
                  </Button>
                  
                  {/* Submit Button - Always show but disable when no submissions */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button 
                            variant="outline"
                            size="default"
                            onClick={() => setShowSubmitDialog(true)}
                            disabled={localSubmittedCount === 0 || localIsSubmitting}
                            className="w-full transition-colors border-green-300/70 hover:border-green-500 hover:bg-green-50/30 text-green-600 dark:border-green-800/50 dark:text-green-400 dark:hover:bg-green-900/20"
                          >
                            {localIsSubmitting ? (
                              <>
                                <div className="animate-spin h-4 w-4 mr-2 border-2 border-green-600 border-t-transparent rounded-full" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Submit {type.charAt(0).toUpperCase() + type.slice(1)}
                              </>
                            )}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {localSubmittedCount === 0 && (
                        <TooltipContent className="bg-muted text-muted-foreground border max-w-xs p-2">
                          <p>Start at least one question before submitting your {type}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tasks List Section */}
          <div>
            <div className="flex items-center gap-2 px-1 mb-4">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Assessment Questions</h2>
            </div>
            <Separator className="mb-6" />
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">#</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Question</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Submitted</th>
                    <th className="text-right py-3 px-4 font-medium text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {localTasks.map((task, index) => (
                    <tr 
                      key={task.id} 
                      className={cn(
                        "border-b transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-900/5",
                        index % 2 === 0 ? "bg-muted/10 dark:bg-muted/15" : ""
                      )}
                    >
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getTaskIcon(task.type)}
                          <span className="ml-2 font-medium">{task.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">
                          {task.score !== undefined ? task.score : 0}/{task.maxScore}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {task.isSubmitted ? (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Submitted
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1.5" />
                            Unsubmitted
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="outline"
                          size="sm"
                          className="transition-colors border-primary/30 hover:border-primary hover:bg-primary/10 text-primary"
                          onClick={() => {
                            handleStartTask(task.id);
                            // Only mark as viewed, not submitted
                            if (!task.isViewed) {
                              markTaskViewed(task.id);
                            }
                          }}
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Submit Confirmation Dialog */}
          <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit {type.charAt(0).toUpperCase() + type.slice(1)}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to submit this {type}? You have completed {localSubmittedCount} out of {localTasks.length} questions.
                  <br /><br />
                  {localSubmittedCount < localTasks.length && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md mt-1 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Some questions are not yet completed. You can still submit, but unanswered questions will be scored as zero.</span>
                    </div>
                  )}
                  After submission, you won't be able to change your answers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleFinishAssessment}
                  className="bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Submit {type.charAt(0).toUpperCase() + type.slice(1)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
} 