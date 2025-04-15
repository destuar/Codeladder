import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RefreshCw, PlusCircle, Edit, Trash2, FileQuestion, Plus, Award, Clock, MessageSquare } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Define interfaces for Topic and Level
interface Topic {
  id: string;
  name: string;
  order: number;
  description?: string;
  levelId: string;
  slug?: string;
}

interface Level {
  id: string;
  name: string;
  order: number;
  description?: string;
  topics: Topic[];
}

// Quiz interface for display and management
interface Quiz {
  id: string;
  name: string;
  description?: string;
  topicId: string;
  passingScore: number;
  estimatedTime?: number;
  orderNum?: number;
  assessmentType: 'QUIZ'; // Added for clarity, should always be QUIZ here
  _count?: {
    questions: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Quiz Question interfaces (Renamed base type for clarity)
interface QuizQuestionBase {
  id?: string; // Optional for new questions
  quizId?: string; // The ID of the quiz/test this belongs to
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CODE';
  points: number;
  orderNum?: number;
}

interface McOption {
  id?: string; // Optional for new options
  text: string;
  isCorrect: boolean;
  orderNum?: number;
}

interface McProblem extends QuizQuestionBase {
  questionType: 'MULTIPLE_CHOICE';
  explanation?: string | null; // Allow null
  shuffleOptions?: boolean;
  options: McOption[];
}

interface TestCase {
  id?: string; // Optional for new test cases
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  orderNum?: number;
}

interface CodeProblem extends QuizQuestionBase {
  questionType: 'CODE';
  language?: string;
  codeTemplate?: string | null; // Allow null
  functionName?: string | null; // Allow null
  timeLimit?: number;
  memoryLimit?: number | null; // Allow null
  testCases: TestCase[];
}

// Union type representing a question in the state (Consistent with TestAdmin)
type QuizQuestion = McProblem | CodeProblem;

/**
 * QuizAdmin Component
 * 
 * Admin interface for managing quizzes in the platform.
 * This component allows administrators to create, edit, and manage quizzes,
 * including multiple choice and code-based questions.
 */
export function QuizAdmin() {
  const { token } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [quizzesByTopic, setQuizzesByTopic] = useState<Record<string, Quiz[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<Record<string, boolean>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  
  // Quiz form state
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [passingScore, setPassingScore] = useState<number>(70);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  
  // Quiz problems state
  const [quizProblems, setQuizProblems] = useState<QuizQuestion[]>([]);
  const [initialQuizProblems, setInitialQuizProblems] = useState<QuizQuestion[]>([]); // Track initial state for edits
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  
  // Problem dialog state
  const [showProblemDialog, setShowProblemDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<QuizQuestion | null>(null);
  const [isProblemEditMode, setIsProblemEditMode] = useState(false);
  const [problemType, setProblemType] = useState<'MULTIPLE_CHOICE' | 'CODE'>('MULTIPLE_CHOICE');
  
  // Problem form state - common fields
  const [problemText, setProblemText] = useState('');
  const [problemPoints, setProblemPoints] = useState<number>(10);
  const [problemOrderNum, setProblemOrderNum] = useState<number | undefined>(undefined);
  
  // Multiple Choice specific state
  const [mcOptions, setMcOptions] = useState<McOption[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [mcExplanation, setMcExplanation] = useState('');
  const [shuffleOptions, setShuffleOptions] = useState(true);
  
  // Code problem specific state
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeTemplate, setCodeTemplate] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(5000);
  const [memoryLimit, setMemoryLimit] = useState<number | undefined>(undefined);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', expectedOutput: '', isHidden: false }
  ]);
  
  // Confirmation dialog for delete
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  // Fetch levels and topics on component mount
  useEffect(() => {
    fetchLevels();
  }, [token]); // Only refetch when token changes

  // Fetch levels and topics
  const fetchLevels = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setFetchErrors({}); // Clear errors on refresh
    try {
      const response = await api.get('/learning/levels', token);
      if (response) {
        setLevels(response);
        
        const loadingState: Record<string, boolean> = {};
        const initialQuizzes: Record<string, Quiz[]> = {};
        
        response.forEach((level: Level) => {
          level.topics.forEach((topic: Topic) => {
            loadingState[topic.id] = false;
            initialQuizzes[topic.id] = []; 
          });
        });
        
        setIsLoadingQuizzes(loadingState);
        setQuizzesByTopic(initialQuizzes); 
        
        // Fetch quizzes for each topic after levels are set
        const fetchPromises = response.flatMap((level: Level) => 
          level.topics.map((topic: Topic) => fetchQuizzesForTopic(topic.id))
        );
        await Promise.allSettled(fetchPromises); // Wait for all initial fetches
        
      }
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast.error("Failed to load learning path structure.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quizzes for a specific topic
  const fetchQuizzesForTopic = async (topicId: string) => {
    if (!token) return;
    
    setIsLoadingQuizzes(prev => ({ ...prev, [topicId]: true }));
    setFetchErrors(prev => ({ ...prev, [topicId]: '' }));
    
    try {
      // Find the topic slug for the modern API
      const topic = levels.flatMap(level => level.topics).find(t => t.id === topicId);
      
      let response;
      if (topic?.slug) {
        // Use slug-based API (prefer this)
        response = await api.getQuizzesByTopicSlug(topic.slug, token);
      } else {
        // Fallback to ID-based API
        console.warn(`Using deprecated ID-based API for topic ${topicId} - slug not available`);
        response = await api.getQuizzesByTopic(topicId, token);
      }
      
      // Ensure response is an array, default to empty array if not
      setQuizzesByTopic(prev => ({ 
        ...prev, 
        [topicId]: Array.isArray(response) ? response : [] 
      }));
    } catch (error) {
      console.error(`Error fetching quizzes for topic ${topicId}:`, error);
      
      let errorMessage = 'Failed to load quizzes';
      if (error instanceof Error) {
        const apiError = error as any;
        if (apiError.status === 404) {
          errorMessage = `Topic not found. It might have been deleted.`;
        } else if (apiError.details) {
          errorMessage = `Failed to load quizzes: ${apiError.details}`;
        } else {
          errorMessage = apiError.message || 'Unknown error';
        }
      }
      
      setFetchErrors(prev => ({ 
        ...prev, 
        [topicId]: `${errorMessage}` 
      }));
      
      // Set to empty array on error to avoid rendering issues
      setQuizzesByTopic(prev => ({
        ...prev,
        [topicId]: []
      }));
      
      // Safely access topic name or fallback to topicId
      const topicIdentifier = levels.flatMap(l => l.topics).find(t => t.id === topicId)?.name || topicId;
    } finally {
      setIsLoadingQuizzes(prev => ({ ...prev, [topicId]: false }));
    }
  };

  // Open the quiz creation dialog
  const handleAddQuiz = (topic: Topic) => {
    setSelectedTopic(topic);
    setQuizName('');
    setQuizDescription('');
    setPassingScore(70);
    setEstimatedTime(undefined);
    setIsEditMode(false);
    setSelectedQuiz(null);
    setQuizProblems([]);
    setInitialQuizProblems([]); // Reset initial state too
    setShowQuizDialog(true);
  };

  // Open the quiz edit dialog
  const handleEditQuiz = async (quiz: Quiz, topic: Topic) => {
    setSelectedTopic(topic);
    setQuizName(quiz.name);
    setQuizDescription(quiz.description || '');
    setPassingScore(quiz.passingScore);
    setEstimatedTime(quiz.estimatedTime);
    setIsEditMode(true);
    setSelectedQuiz(quiz);
    
    // Fetch quiz questions when editing
    setIsLoadingProblems(true);
    setQuizProblems([]); // Clear current problems
    setInitialQuizProblems([]); // Clear initial problems
    setShowQuizDialog(true); // Show dialog immediately
    
    if (quiz.id && token) {
      try {
        // Assume api.getQuizQuestions exists (like in TestAdmin)
        const fetchedQuestions: QuizQuestion[] = await api.getQuizQuestions(quiz.id, token); 
        console.log('Fetched quiz questions:', fetchedQuestions);
        setQuizProblems(fetchedQuestions);
        setInitialQuizProblems(fetchedQuestions); // Store the initial state
      } catch (error) {
        console.error('Error loading quiz questions:', error);
        toast.error('Failed to load quiz questions.');
        setQuizProblems([]);
        setInitialQuizProblems([]);
      } finally {
        setIsLoadingProblems(false);
      }
    } else {
      // If no quiz ID or token, stop loading and show empty
      setQuizProblems([]);
      setInitialQuizProblems([]);
      setIsLoadingProblems(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteDialog(true);
  };

  // Close the quiz creation/edit dialog
  const handleCloseDialog = () => {
    setShowQuizDialog(false);
    setSelectedTopic(null);
    setSelectedQuiz(null);
    setQuizProblems([]);
    setInitialQuizProblems([]); // Also clear initial problems on close
  };

  // Delete a quiz (Unchanged, uses DELETE /api/quizzes/:id)
  const handleDeleteQuiz = async () => {
    if (!quizToDelete || !token) return;

    try {
      await api.deleteQuiz(quizToDelete.id, token);
      toast.success('Quiz deleted successfully');
      
      if (quizToDelete.topicId) {
        fetchQuizzesForTopic(quizToDelete.topicId);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    } finally {
      setShowDeleteDialog(false);
      setQuizToDelete(null);
    }
  };

  // DND Handler - Unchanged
  const handleOnDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return; 

    const items = Array.from(quizProblems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      orderNum: index + 1,
    }));

    setQuizProblems(updatedItems);
    toast.info("Question order updated locally."); 
  }, [quizProblems]);

  // Save (create/update) a quiz - Refactored
  const handleSaveQuiz = async () => {
    if (!selectedTopic || !token) return;
    
    // --- Frontend Validation ---
    const errors = [];
    if (!quizName.trim()) errors.push("Quiz name is required");
    if (!quizDescription.trim()) errors.push("Description is required");
    if (estimatedTime === undefined || estimatedTime === null || estimatedTime <= 0) {
      errors.push("Estimated time is required and must be positive");
    }
    if (passingScore === undefined || passingScore === null || passingScore < 0 || passingScore > 100) {
      errors.push("Passing score is required and must be between 0 and 100");
    }
    if (!isEditMode && quizProblems.length === 0) {
      errors.push("At least one question is required for new quizzes");
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    // --- Prepare Data ---
    // 1. Quiz Metadata (for create/update assessment endpoint)
    const quizMetadata = {
      name: quizName.trim(),
      description: quizDescription.trim() || undefined,
      topicId: selectedTopic.id,
      passingScore,
      estimatedTime,
      assessmentType: 'QUIZ' as const // Explicitly set type
      // orderNum can be added here if needed for quiz ordering
    };
    
    // 2. Prepare Problems (for question endpoints or initial creation)
    // Ensure orderNum is based on final array index before saving
    const preparedProblems = quizProblems.map((problem, index) => {
      const baseProblem = {
        id: problem.id?.startsWith('temp_') ? undefined : problem.id, // Don't send temp IDs
        questionText: problem.questionText.trim(),
        questionType: problem.questionType,
        points: problem.points || 1,
        orderNum: index + 1, // Ensure orderNum reflects final position
      };
      
      if (problem.questionType === 'MULTIPLE_CHOICE') {
        const mcProblem = problem as McProblem;
        return {
          ...baseProblem,
          explanation: mcProblem.explanation || null,
          shuffleOptions: mcProblem.shuffleOptions !== false,
          options: mcProblem.options
            .filter(opt => opt.text.trim()) 
            .map((option, optIndex) => ({
              id: option.id?.startsWith('temp_') ? undefined : option.id,
              text: option.text.trim(),
              isCorrect: Boolean(option.isCorrect),
              orderNum: option.orderNum || optIndex + 1
            }))
        };
      } else if (problem.questionType === 'CODE') {
        const codeProblem = problem as CodeProblem;
        return {
          ...baseProblem,
          language: codeProblem.language || 'javascript',
          codeTemplate: codeProblem.codeTemplate || null,
          functionName: codeProblem.functionName || null,
          timeLimit: codeProblem.timeLimit || 5000,
          memoryLimit: codeProblem.memoryLimit === null ? undefined : codeProblem.memoryLimit,
          testCases: (codeProblem.testCases || [])
            .filter(tc => tc.input.trim() || tc.expectedOutput.trim()) 
            .map((testCase, tcIndex) => ({
               id: testCase.id?.startsWith('temp_') ? undefined : testCase.id,
              input: testCase.input.trim() || '',
              expectedOutput: testCase.expectedOutput.trim() || '',
              isHidden: Boolean(testCase.isHidden),
              orderNum: testCase.orderNum || tcIndex + 1
            }))
        };
      }
      return baseProblem; // Fallback
    });

    // --- Backend Validation (Optional but Recommended) ---
    // Call the validation endpoint if it exists and handles metadata + problems
    // toast.info("Validating quiz data...");
    // const validationResult = await api.validateQuiz({...quizMetadata, problems: preparedProblems }, token); // Pass prepared data
    // if (!validationResult.isValid) { ... handle validation errors ... return; }

    try {
      toast.info(isEditMode ? "Updating quiz..." : "Creating quiz...");
      
      let savedQuizId: string;
      
      // --- Step 1: Save Quiz Metadata (Edit) OR Create Quiz + Problems (Create) ---
      if (isEditMode && selectedQuiz) {
        // --- EDIT MODE ---
        // Update existing quiz metadata (using the backend route that ignores 'problems')
        const updatedQuiz = await api.updateQuiz(selectedQuiz.id, quizMetadata, token);
        savedQuizId = updatedQuiz.id;
        toast.success('Quiz metadata updated successfully');
        
        // --- Step 2 (EDIT MODE ONLY): Handle Questions (Create/Update/Delete) ---
        let deletedQuestionIds: string[] = [];
        // Explicitly filter and cast to ensure we have a Set<string>
        const initialIds = new Set(initialQuizProblems.map(q => q.id).filter((id): id is string => !!id));
        const currentIds = new Set(preparedProblems.map(q => q.id).filter(Boolean));
        deletedQuestionIds = [...initialIds].filter(id => !currentIds.has(id));
        
        // Delete removed questions first
        if (deletedQuestionIds.length > 0) {
          toast.info(`Deleting ${deletedQuestionIds.length} question(s)...`);
          const deletePromises = deletedQuestionIds.map(qid => 
            api.deleteQuizQuestion(qid, token).catch(err => {
              console.error(`Failed to delete question ${qid}:`, err);
              toast.error(`Failed to delete question ID ${qid}`); 
              return null; // Allow Promise.allSettled to continue
            })
          );
          await Promise.allSettled(deletePromises);
        }
  
        // Create/Update remaining questions
        if (preparedProblems.length > 0) {
          toast.info(`Saving ${preparedProblems.length} question(s)...`);
          let createdCount = 0;
          let updatedCount = 0;
          let errorCount = 0;
          
          const savePromises = preparedProblems.map(problem => {
            if (problem.id) { // Existing question -> Update
              return api.updateQuizQuestion(problem.id, problem, token) // Use updateQuizQuestion now
                .then(() => updatedCount++)
                .catch(err => {
                  console.error(`Failed to update question ${problem.id}:`, err);
                  toast.error(`Failed to update question: ${problem.questionText}`);
                  errorCount++;
                });
            } else { // New question -> Create
              return api.createQuizQuestion(savedQuizId, problem, token)
                .then(() => createdCount++)
                .catch(err => {
                  console.error(`Failed to create question:`, err);
                  toast.error(`Failed to create question: ${problem.questionText}`);
                  errorCount++;
                });
            }
          });
          
          await Promise.allSettled(savePromises);
  
          // Summarize question save results
          if (errorCount === 0) {
            if (createdCount > 0 || updatedCount > 0) {
              toast.success(`Successfully saved ${createdCount + updatedCount} question(s).`);
            }
          } else {
             toast.warning(`Saved ${createdCount + updatedCount} question(s), but ${errorCount} failed.`);
          }
        }
        // --- END Step 2 (EDIT MODE ONLY) ---
      } else {
        // --- CREATE MODE ---
        // Create new quiz (using the backend route that accepts 'problems')
        const createdQuiz = await api.createQuiz({...quizMetadata, problems: preparedProblems }, token); // Send problems on CREATE
        savedQuizId = createdQuiz.id;
        toast.success('Quiz created successfully');
        // DO NOT proceed to Step 2 for create mode.
      }
      
      // Refresh quizzes list for the topic
      fetchQuizzesForTopic(selectedTopic.id);
      
      // Close the dialog
      handleCloseDialog();
      
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(isEditMode ? `Failed to update quiz: ${error instanceof Error ? error.message : 'Unknown error'}` 
                             : `Failed to create quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Format estimated time for display - Unchanged
  const formatTime = (minutes?: number): string => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Handle opening the problem dialog - Unchanged
  const handleAddProblem = () => {
    setSelectedProblem(null);
    setIsProblemEditMode(false);
    setProblemType('MULTIPLE_CHOICE');
    
    // Reset form fields
    setProblemText('');
    setProblemPoints(10);
    setProblemOrderNum(undefined);
    setMcOptions([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]);
    setMcExplanation('');
    setShuffleOptions(true);
    setCodeLanguage('javascript');
    setCodeTemplate('');
    setFunctionName('');
    setTimeLimit(5000);
    setMemoryLimit(undefined);
    setTestCases([
      { input: '', expectedOutput: '', isHidden: false }
    ]);
    
    setShowProblemDialog(true);
  };
  
  // Handle editing an existing problem - Unchanged (operates on local state)
  const handleEditProblem = (problem: QuizQuestion) => { 
    const problemCopy = JSON.parse(JSON.stringify(problem)); // Deep copy
    
    setSelectedProblem(problemCopy);
    setIsProblemEditMode(true);
    setProblemType(problem.questionType);
    
    setProblemText(problem.questionText);
    setProblemPoints(problem.points);
    setProblemOrderNum(problem.orderNum);
    
    if (problem.questionType === 'MULTIPLE_CHOICE') {
      const mcProblem = problem as McProblem;
      setMcOptions([...mcProblem.options]); 
      setMcExplanation(mcProblem.explanation || '');
      setShuffleOptions(mcProblem.shuffleOptions !== false); 
    } else {
      const codeProblem = problem as CodeProblem;
      setCodeLanguage(codeProblem.language || 'javascript');
      setCodeTemplate(codeProblem.codeTemplate || '');
      setFunctionName(codeProblem.functionName || '');
      setTimeLimit(codeProblem.timeLimit || 5000);
      setMemoryLimit(codeProblem.memoryLimit === null ? undefined : codeProblem.memoryLimit);
      setTestCases([...codeProblem.testCases]);
    }
    
    setShowProblemDialog(true);
  };
  
  // Handle closing the problem dialog - Unchanged
  const handleCloseProblemDialog = () => {
    setShowProblemDialog(false);
    setSelectedProblem(null);
  };
  
  // Handle saving a problem to the LOCAL state - Unchanged (operates on local state)
  const handleSaveProblem = () => {
    if (!problemText.trim()) {
      toast.error("Problem text is required");
      return;
    }
    
    let newOrUpdatedProblem: QuizQuestion;
    
    if (problemType === 'MULTIPLE_CHOICE') {
      const filledOptions = mcOptions.filter(opt => opt.text.trim());
      if (filledOptions.length < 2) {
        toast.error("At least 2 options are required");
        return;
      }
      const hasCorrectOption = mcOptions.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        toast.error("At least one option must be marked as correct");
        return;
      }
      
      newOrUpdatedProblem = {
        id: selectedProblem?.id, // Keep existing ID if editing
        questionText: problemText.trim(),
        questionType: 'MULTIPLE_CHOICE',
        points: problemPoints,
        options: filledOptions.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          orderNum: opt.orderNum
        })),
        shuffleOptions: shuffleOptions
        // orderNum is set during main save
      };
      
    } else { // Code Problem
      if (!codeLanguage) {
        toast.error("Programming language is required");
        return;
      }
      const validTestCases = testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim()); // Allow empty input OR output
      if (validTestCases.length === 0) {
        toast.error("At least one test case is required");
        return;
      }
      
      newOrUpdatedProblem = {
        id: selectedProblem?.id, // Keep existing ID if editing
        questionText: problemText.trim(),
        questionType: 'CODE',
        points: problemPoints,
        language: codeLanguage,
        codeTemplate: codeTemplate.trim() || undefined,
        functionName: functionName.trim() || undefined,
        timeLimit: timeLimit,
        memoryLimit: memoryLimit,
        testCases: validTestCases.map(tc => ({ ...tc })) // Deep copy test cases
        // orderNum is set during main save
      };
    }
    
    // Add/update problem in quiz problems array
    if (isProblemEditMode && selectedProblem) {
      // Replace existing problem by ID or reference if no ID exists yet
      setQuizProblems(prevProblems => 
        prevProblems.map(p => 
          (p.id && p.id === selectedProblem.id) || (!p.id && p === selectedProblem) 
            ? newOrUpdatedProblem 
            : p
        )
      );
    } else {
      // Add new problem with a temporary ID
      const tempId = `temp_${Date.now()}`;
      setQuizProblems(prevProblems => [...prevProblems, { ...newOrUpdatedProblem, id: tempId }]);
    }
    
    toast.success(isProblemEditMode ? "Problem updated locally" : "Problem added locally");
    handleCloseProblemDialog();
  };

  // Remove a problem from the LOCAL state - Unchanged (operates on local state)
  const handleRemoveProblem = (problemToRemove: QuizQuestion) => {
    setQuizProblems(prevProblems => 
      prevProblems.filter(p => 
        p.id ? p.id !== problemToRemove.id : p !== problemToRemove // Compare by ID or reference
      )
    );
    toast.success("Problem removed locally");
  };

  // --- RENDER LOGIC (Mostly Unchanged) ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Quiz Editor</h2>
          <p className="text-muted-foreground mt-1">Manage quizzes for your learning path topics</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchLevels} // Re-fetch levels and quizzes
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => ( // Skeleton loaders
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-10 bg-muted rounded w-full mt-2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : levels.length === 0 ? (
        // No levels found
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center">
              <FileQuestion className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No levels or topics found.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                 Create your learning path structure first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Display levels and topics
        <div className="grid gap-6">
          {levels.map((level) => (
            <Card key={level.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl">Level: {level.name}</CardTitle> {/* Adjusted size */}
                  <CardDescription>{level.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {level.topics.length === 0 ? (
                     <p className="text-sm text-muted-foreground p-4">No topics in this level.</p>
                  ) : level.topics.map((topic) => (
                    <Card key={topic.id} className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 bg-muted/30 border-b"> {/* Adjusted padding/bg */}
                        <div>
                          <CardTitle className="text-base font-medium">{topic.name}</CardTitle> {/* Adjusted size */}
                          {topic.description && <CardDescription className="text-xs mt-1">{topic.description}</CardDescription>} {/* Adjusted size */}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAddQuiz(topic)}
                          >
                            <Plus className="h-4 w-4 mr-1" /> 
                            Add Quiz
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 min-h-[80px]"> {/* Adjusted padding/min-h */}
                        {isLoadingQuizzes[topic.id] ? (
                          <div className="flex justify-center items-center h-full">
                             <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : fetchErrors[topic.id] ? (
                          <div className="flex flex-col items-center justify-center p-4 border border-destructive/50 bg-destructive/10 rounded-lg gap-2">
                            <p className="text-destructive text-center text-sm">
                              {fetchErrors[topic.id]}
                            </p>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => fetchQuizzesForTopic(topic.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          </div>
                        ) : (quizzesByTopic[topic.id] && quizzesByTopic[topic.id].length > 0) ? (
                          <div className="space-y-2"> {/* Adjusted spacing */}
                            {quizzesByTopic[topic.id].map((quiz) => (
                              <div 
                                key={quiz.id} 
                                className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <div className="space-y-0.5 flex-grow mr-2">
                                  {/* Keep Quiz Name */}
                                  <div className="font-medium text-sm">{quiz.name}</div>
                                  
                                  {/* === Start Replacement === */}
                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"> 
                                    {/* Passing Score */}
                                    <div className="flex items-center">
                                      <Award className="h-3.5 w-3.5 mr-1" />
                                      <span>Pass: {quiz.passingScore}%</span>
                                    </div>
                                    
                                    {/* Estimated Time */}
                                    {quiz.estimatedTime && (
                                      <div className="flex items-center">
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        <span>{formatTime(quiz.estimatedTime)}</span>
                                      </div>
                                    )}
                                    
                                    {/* Question Count */}
                                    <div className="flex items-center">
                                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                      <span>
                                        {quiz._count?.questions || 0} {(quiz._count?.questions || 0) === 1 ? 'Question' : 'Questions'}
                                      </span>
                                    </div>
                                  </div>
                                  {/* === End Replacement === */}

                                  {/* Keep Quiz Description */}
                                  {quiz.description && (
                                    <div className="text-xs text-muted-foreground pt-1">
                                      {quiz.description}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0"> {/* Adjusted gap */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" // Consistent size
                                    className="h-7 px-2" // Smaller padding
                                    onClick={() => handleEditQuiz(quiz, topic)}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-1" /> {/* Adjusted size */}
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" // Consistent size
                                    className="text-destructive hover:text-destructive h-7 px-2" // Smaller padding
                                    onClick={() => handleDeleteClick(quiz)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {/* Adjusted size */}
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-4">
                            <FileQuestion className="h-8 w-8 text-muted-foreground mb-2" /> {/* Adjusted size */}
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              No quizzes added yet.
                            </p>
                            <p className="text-xs text-muted-foreground mb-2"> {/* Adjusted margin */}
                              Add a quiz to this topic using the button above.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddQuiz(topic)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add First Quiz
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quiz Creation/Edit Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={handleCloseDialog}> {/* Use handleCloseDialog */}
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? `Editing quiz "${quizName || '...'}" for topic: ${selectedTopic?.name || 'Unknown'}.`
                : `Adding a new quiz to topic: ${selectedTopic?.name || 'Unknown'}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4"> {/* Added padding */}
            {/* Quiz Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Quiz Name <span className="text-destructive">*</span></Label>
                <Input id="name" placeholder="Enter quiz name" value={quizName} onChange={(e) => setQuizName(e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                <Textarea id="description" placeholder="Enter quiz description" value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="passing-score">Passing Score (%) <span className="text-destructive">*</span></Label>
                <Input id="passing-score" type="number" value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)} min={0} max={100} required />
              </div>
              <div>
                <Label htmlFor="estimated-time">Estimated Time (minutes) <span className="text-destructive">*</span></Label>
                <Input id="estimated-time" type="number" value={estimatedTime || ''} onChange={(e) => setEstimatedTime(e.target.value ? parseInt(e.target.value) : undefined)} min={1} placeholder="e.g., 15" required />
              </div>
            </div>

            {/* Quiz Questions Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Quiz Questions {!isEditMode && <span className="text-destructive">*</span>}
                </h3>
                <Button variant="outline" size="sm" onClick={handleAddProblem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </div>
              
              {/* Drag and Drop List */}
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 min-h-[150px]"> {/* Added min-h */}
                      {isLoadingProblems ? (
                        <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                          <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                          <p className="text-sm">Loading questions...</p>
                        </div>
                      ) : quizProblems.length > 0 ? (
                        quizProblems.map((problem, index) => (
                          <Draggable key={problem.id || `temp-${index}`} draggableId={problem.id || `temp-${index}`} index={index}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                {...provided.dragHandleProps}
                                className="flex items-center justify-between border rounded-md p-3 bg-background hover:bg-accent transition-colors cursor-grab" // Added cursor
                              >
                                <div className="flex-grow space-y-1 mr-2 overflow-hidden"> {/* Added overflow */}
                                  <div className="flex items-center space-x-2 text-xs"> {/* Adjusted size */}
                                    <Badge variant="secondary" className="px-1.5 py-0"> {/* Adjusted padding */}
                                      {problem.questionType === 'MULTIPLE_CHOICE' ? 'MC' : 'Code'}
                                    </Badge>
                                    <Badge variant="outline" className="px-1.5 py-0">{problem.points} pts</Badge>
                                    <Badge variant="outline" className="px-1.5 py-0">Order: {index + 1}</Badge>
                                  </div>
                                  <p className="text-sm font-medium mt-1 truncate">{problem.questionText}</p> {/* Added truncate */}
                                  {problem.questionType === 'MULTIPLE_CHOICE' && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {(problem as McProblem).options.length} opts, { (problem as McProblem).options.filter(o => o.isCorrect).length} correct
                                    </p>
                                  )}
                                   {problem.questionType === 'CODE' && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {(problem as CodeProblem).language}, {(problem as CodeProblem).testCases.length} cases
                                    </p>
                                  )}
                                </div>
                                <div className="flex space-x-1 flex-shrink-0">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditProblem(problem)} className="h-7 w-7"> {/* Adjusted size */}
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7" onClick={() => handleRemoveProblem(problem)}> {/* Adjusted size */}
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        // Empty state for questions
                        <div className="border-2 border-dashed rounded-md p-6 text-center"> {/* Adjusted padding */}
                          <FileQuestion className="h-8 w-8 mx-auto text-muted-foreground mb-2" /> 
                          <p className="text-sm text-muted-foreground mb-1">No questions added yet</p> 
                          <p className="text-xs text-muted-foreground mt-1 mb-3"> 
                            Add questions using the button above.
                          </p>
                          <Button variant="outline" size="sm" onClick={handleAddProblem}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add First Question
                          </Button>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveQuiz}>
              {isEditMode ? 'Update Quiz' : 'Create Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Problem Creation/Edit Dialog (Unchanged - operates locally) */}
      <Dialog open={showProblemDialog} onOpenChange={handleCloseProblemDialog}>
         {/* ... Content is identical to previous version ... */}
         {/* (Assume the problem dialog code from lines 838 to 1375 remains the same) */}
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isProblemEditMode ? 'Edit Problem' : 'Add New Problem'}
            </DialogTitle>
            <DialogDescription>
              {isProblemEditMode 
                ? `Edit problem for ${quizName || 'this quiz'}.`
                : `Add a problem to ${quizName || 'this quiz'}.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="multiple-choice" value={problemType.toLowerCase().replace('_', '-')} onValueChange={(val) => {
            if (val === 'multiple-choice') setProblemType('MULTIPLE_CHOICE');
            else if (val === 'code') setProblemType('CODE');
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
              <TabsTrigger value="code">Code Problem</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-4">
              {/* Common fields for both problem types */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="problem-text">
                    Problem Text <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="problem-text"
                    placeholder="Enter the problem text"
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="problem-points">
                    Points <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="problem-points"
                    type="number"
                    value={problemPoints}
                    onChange={(e) => setProblemPoints(parseInt(e.target.value) || 1)}
                    min={1}
                    max={100}
                    className="w-full"
                    required
                  />
                </div>
              </div>
              
              {/* Type-specific fields */}
              <TabsContent value="multiple-choice" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>
                    Options <span className="text-destructive">*</span>
                  </Label>
                  {mcOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...mcOptions];
                            newOptions[index].text = e.target.value;
                            setMcOptions(newOptions);
                          }}
                          required
                        />
                      </div>
                      <div className="flex-none">
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => {
                            const newOptions = mcOptions.map((opt, i) => {
                              if (i === index) {
                                return { ...opt, isCorrect: !!checked };
                              } else if (checked) {
                                return { ...opt, isCorrect: false };
                              } else {
                                return opt;
                              }
                            });
                            setMcOptions(newOptions);
                          }}
                          aria-label={`Mark option ${index + 1} as correct`}
                        />
                      </div>
                      <div className="flex-none">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newOptions = mcOptions.filter((_, i) => i !== index);
                            if (newOptions.length >= 2) { // Ensure at least 2 options remain
                              setMcOptions(newOptions);
                            } else {
                              toast.warning("Must have at least 2 options.");
                            }
                          }}
                          disabled={mcOptions.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMcOptions([...mcOptions, { text: '', isCorrect: false }])}
                    className="mt-2"
                  >
                    Add Option
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="mc-explanation">
                    Global Explanation (Optional)
                  </Label>
                  <Textarea
                    id="mc-explanation"
                    value={mcExplanation}
                    onChange={(e) => setMcExplanation(e.target.value)}
                    placeholder="Explanation for the correct answer (shown after submission)"
                    className="w-full"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="shuffle-options"
                    checked={shuffleOptions}
                    onCheckedChange={(checked) => setShuffleOptions(!!checked)}
                  />
                  <Label htmlFor="shuffle-options" className="font-medium">
                    Shuffle options when displayed to students
                  </Label>
                </div>
              </TabsContent>
              
              <TabsContent value="code" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="code-language">
                    Programming Language <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={codeLanguage}
                    onValueChange={setCodeLanguage}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select programming language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="csharp">C#</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="function-name">
                    Function Name (Optional)
                  </Label>
                  <Input
                    id="function-name"
                    value={functionName}
                    onChange={(e) => setFunctionName(e.target.value)}
                    placeholder="Name of the function to implement (e.g., 'calculateSum')"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="code-template">
                    Starting Code Template (Optional)
                  </Label>
                  <Textarea
                    id="code-template"
                    value={codeTemplate}
                    onChange={(e) => setCodeTemplate(e.target.value)}
                    placeholder="Starting code provided to the user"
                    className="w-full font-mono text-sm" // Added font-mono
                  />
                </div>

                <div className="grid grid-cols-2 gap-4"> {/* Grid for limits */}
                    <div className="space-y-2">
                        <Label htmlFor="time-limit">Time Limit (ms)</Label>
                        <Input id="time-limit" type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value) || 5000)} min={1000} step={100} placeholder="Execution time limit (ms)" className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="memory-limit">Memory Limit (MB, Optional)</Label>
                        <Input id="memory-limit" type="number" value={memoryLimit || ''} onChange={(e) => setMemoryLimit(e.target.value ? parseInt(e.target.value) : undefined)} min={1} placeholder="Default" className="w-full" />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Test Cases <span className="text-destructive">*</span>
                  </Label>
                  <div className="border rounded-md p-4 space-y-4 max-h-[400px] overflow-y-auto"> {/* Max height + scroll */}
                    {testCases.map((testCase, index) => (
                      <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newTestCases = testCases.filter((_, i) => i !== index);
                                if (newTestCases.length > 0) { // Ensure at least one test case remains
                                  setTestCases(newTestCases);
                                } else {
                                   toast.warning("Must have at least 1 test case.");
                                }
                              }}
                              disabled={testCases.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`test-input-${index}`} className="text-xs">
                              Input <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id={`test-input-${index}`}
                              value={testCase.input}
                              onChange={(e) => {
                                const newTestCases = [...testCases];
                                newTestCases[index].input = e.target.value;
                                setTestCases(newTestCases);
                              }}
                              placeholder="Test input"
                              className="min-h-[80px] font-mono text-sm" // Font mono
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`test-output-${index}`} className="text-xs">
                              Expected Output <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id={`test-output-${index}`}
                              value={testCase.expectedOutput}
                              onChange={(e) => {
                                const newTestCases = [...testCases];
                                newTestCases[index].expectedOutput = e.target.value;
                                setTestCases(newTestCases);
                              }}
                              placeholder="Expected output"
                               className="min-h-[80px] font-mono text-sm" // Font mono
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`test-hidden-${index}`}
                            checked={testCase.isHidden}
                            onCheckedChange={(checked) => {
                              const newTestCases = [...testCases];
                              newTestCases[index].isHidden = !!checked;
                              setTestCases(newTestCases);
                            }}
                          />
                          <Label htmlFor={`test-hidden-${index}`} className="text-sm">
                            Hidden test case (not shown to user)
                          </Label>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTestCases([...testCases, { input: '', expectedOutput: '', isHidden: false }])}
                      className="w-full mt-2" // Added margin
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Test Case
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseProblemDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveProblem}> 
              {isProblemEditMode ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (Unchanged) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quiz "{quizToDelete?.name}" and all its questions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default QuizAdmin; 