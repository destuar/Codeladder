import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RefreshCw, PlusCircle, Edit, Trash2, FileQuestion } from 'lucide-react';
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
  _count?: {
    questions: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Quiz Question interfaces
interface QuizQuestion {
  id?: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CODE';
  points: number;
  orderNum?: number;
  difficulty?: string;
}

interface McOption {
  id?: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  orderNum?: number;
}

interface McProblem extends QuizQuestion {
  questionType: 'MULTIPLE_CHOICE';
  explanation?: string;
  shuffleOptions?: boolean;
  options: McOption[];
}

interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  orderNum?: number;
}

interface CodeProblem extends QuizQuestion {
  questionType: 'CODE';
  language: string;
  codeTemplate?: string;
  functionName?: string;
  timeLimit?: number;
  memoryLimit?: number;
  testCases: TestCase[];
}

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
  const [quizOrderNum, setQuizOrderNum] = useState<number | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  
  // Quiz problems state
  const [quizProblems, setQuizProblems] = useState<(McProblem | CodeProblem)[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  
  // Problem dialog state
  const [showProblemDialog, setShowProblemDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<McProblem | CodeProblem | null>(null);
  const [isProblemEditMode, setIsProblemEditMode] = useState(false);
  const [problemType, setProblemType] = useState<'MULTIPLE_CHOICE' | 'CODE'>('MULTIPLE_CHOICE');
  
  // Problem form state - common fields
  const [problemText, setProblemText] = useState('');
  const [problemPoints, setProblemPoints] = useState<number>(10);
  const [problemDifficulty, setProblemDifficulty] = useState<string>('MEDIUM');
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
  }, [token]);

  // Fetch levels and topics
  const fetchLevels = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await api.get('/learning/levels', token);
      if (response) {
        setLevels(response);
        
        // Initialize loading state and quizzes for each topic
        const loadingState: Record<string, boolean> = {};
        const initialQuizzes: Record<string, Quiz[]> = {};
        
        response.forEach((level: Level) => {
          level.topics.forEach((topic: Topic) => {
            loadingState[topic.id] = false;
            initialQuizzes[topic.id] = []; // Initialize with empty arrays
          });
        });
        
        setIsLoadingQuizzes(loadingState);
        setQuizzesByTopic(initialQuizzes); // Set initial empty arrays
        
        // Fetch quizzes for each topic
        response.forEach((level: Level) => {
          level.topics.forEach((topic: Topic) => {
            fetchQuizzesForTopic(topic.id);
          });
        });
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
    setFetchErrors(prev => ({ ...prev, [topicId]: '' })); // Clear previous errors
    
    try {
      // Find the topic in the available levels/topics to get its slug
      const topic = levels.flatMap(level => level.topics).find(t => t.id === topicId);
      
      let response;
      if (topic?.slug) {
        // Preferred: use the slug-based API if slug is available
        response = await api.getQuizzesByTopicSlug(topic.slug, token);
      } else {
        // Fallback: use the deprecated ID-based API with a warning in the console
        console.warn(`Using deprecated ID-based API for topic ${topicId} - slug not available`);
        response = await api.getQuizzesByTopic(topicId, token);
      }
      
      // Initialize as empty array if response is null or undefined
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
          errorMessage = `Topic not found. The topic might have been deleted.`;
        } else if (apiError.details) {
          errorMessage = `Failed to load quizzes: ${apiError.details}`;
        } else {
          errorMessage = error.message || 'Unknown error';
        }
      }
      
      setFetchErrors(prev => ({ 
        ...prev, 
        [topicId]: `${errorMessage}. The server might be down or experiencing issues.` 
      }));
      
      // Also initialize an empty array for this topic to avoid rendering issues
      setQuizzesByTopic(prev => ({
        ...prev,
        [topicId]: []
      }));
      
      toast.error(`Failed to load quizzes for topic`);
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
    setQuizOrderNum(undefined);
    setIsEditMode(false);
    setSelectedQuiz(null);
    setQuizProblems([]);
    setShowQuizDialog(true);
  };

  // Open the quiz edit dialog
  const handleEditQuiz = (quiz: Quiz, topic: Topic) => {
    setSelectedTopic(topic);
    setQuizName(quiz.name);
    setQuizDescription(quiz.description || '');
    setPassingScore(quiz.passingScore);
    setEstimatedTime(quiz.estimatedTime);
    setQuizOrderNum(quiz.orderNum);
    setIsEditMode(true);
    setSelectedQuiz(quiz);
    
    // Load problems from local storage for demonstration
    setIsLoadingProblems(true);
    setTimeout(() => {
      try {
        const savedQuizzes = JSON.parse(localStorage.getItem('draftQuizProblems') || '{}');
        const savedProblems = savedQuizzes[quiz.id] || [];
        setQuizProblems(savedProblems);
      } catch (error) {
        console.error('Error loading saved problems:', error);
        setQuizProblems([]);
      } finally {
        setIsLoadingProblems(false);
      }
    }, 500); // Simulate loading delay
    
    setShowQuizDialog(true);
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
  };

  // Delete a quiz
  const handleDeleteQuiz = async () => {
    if (!quizToDelete || !token) return;

    try {
      await api.deleteQuiz(quizToDelete.id, token);
      toast.success('Quiz deleted successfully');
      
      // Refresh quizzes for the topic
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

  // Save (create/update) a quiz
  const handleSaveQuiz = async () => {
    if (!selectedTopic || !token) return;
    
    // Enhanced validation - collect all validation errors
    const errors = [];
    
    if (!quizName.trim()) {
      errors.push("Quiz name is required");
    }
    
    if (passingScore < 0 || passingScore > 100) {
      errors.push("Passing score must be between 0 and 100");
    }
    
    if (estimatedTime !== undefined && (estimatedTime <= 0 || isNaN(estimatedTime))) {
      errors.push("Estimated time must be a positive number");
    }
    
    // If we're in create mode, require at least one question
    if (!isEditMode && quizProblems.length === 0) {
      errors.push("Quiz must have at least one question");
    }
    
    // Display all validation errors if any
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      // Transform the problems to ensure they meet backend requirements
      const preparedProblems = quizProblems.map((problem, index) => {
        // Common preparation for all problem types
        const baseProblem = {
          questionText: problem.questionText.trim(),
          questionType: problem.questionType,
          points: problem.points || 1,
          orderNum: problem.orderNum || index + 1,
          difficulty: problem.difficulty || 'MEDIUM'
        };
        
        if (problem.questionType === 'MULTIPLE_CHOICE') {
          const mcProblem = problem as McProblem;
          return {
            ...baseProblem,
            explanation: mcProblem.explanation || null,
            shuffleOptions: mcProblem.shuffleOptions !== false,
            options: mcProblem.options
              .filter(opt => opt.text.trim()) // Remove empty options
              .map((option, optIndex) => ({
                text: option.text.trim(),
                isCorrect: Boolean(option.isCorrect),
                explanation: option.explanation || null,
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
            memoryLimit: codeProblem.memoryLimit || null,
            testCases: (codeProblem.testCases || [])
              .filter(tc => tc.input.trim() || tc.expectedOutput.trim()) // Remove empty test cases
              .map((testCase, tcIndex) => ({
                input: testCase.input.trim() || '',
                expectedOutput: testCase.expectedOutput.trim() || '',
                isHidden: Boolean(testCase.isHidden),
                orderNum: testCase.orderNum || tcIndex + 1
              }))
          };
        }
        
        return baseProblem; // Fallback
      });
      
      // Debug the prepared data before sending
      console.log('Prepared quiz data:', {
        name: quizName,
        problems: preparedProblems
      });
      
      const quizData = {
        name: quizName,
        description: quizDescription || undefined,
        topicId: selectedTopic.id,
        passingScore,
        estimatedTime,
        orderNum: quizOrderNum,
        problems: preparedProblems
      };
      
      // First validate the quiz data on the server
      toast.info("Validating quiz data...");
      const validationResult = await api.validateQuiz(quizData, token);
      
      if (!validationResult.isValid) {
        // Show validation errors
        if (validationResult.generalErrors && validationResult.generalErrors.length > 0) {
          validationResult.generalErrors.forEach((error: string) => toast.error(error));
        }
        
        if (validationResult.problemErrors && validationResult.problemErrors.length > 0) {
          validationResult.problemErrors.forEach((pe: {index: number; errors: string[]}) => {
            pe.errors.forEach(error => toast.error(`Problem ${pe.index + 1}: ${error}`));
          });
        }
        
        toast.error("Please fix the errors before saving the quiz");
        return;
      }
      
      // If validation passed, proceed with creating/updating the quiz
      let response;
      
      if (isEditMode && selectedQuiz) {
        // Update existing quiz
        response = await api.updateQuiz(selectedQuiz.id, quizData, token);
        toast.success('Quiz updated successfully');
        
        // Create or update problems
        if (quizProblems.length > 0) {
          // Problems are now sent with the quiz data, no need for additional API calls
          toast.info(`${quizProblems.length} question(s) saved with the quiz`);
        }
      } else {
        // Create new quiz
        response = await api.createQuiz(quizData, token);
        toast.success('Quiz created successfully');
        
        // Create problems
        if (quizProblems.length > 0) {
          // Problems are now sent with the quiz data, no need for additional API calls
          toast.info(`${quizProblems.length} question(s) saved with the quiz`);
        }
      }
      
      // No need to save problems in localStorage anymore as they're saved in the database
      // We'll keep it for now for backward compatibility
      const savedQuizzes = JSON.parse(localStorage.getItem('draftQuizProblems') || '{}');
      savedQuizzes[response.id] = quizProblems;
      localStorage.setItem('draftQuizProblems', JSON.stringify(savedQuizzes));
      
      // Refresh quizzes for the topic
      fetchQuizzesForTopic(selectedTopic.id);
      
      // Close the dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving quiz:', error);
      
      // Provide more helpful error message based on the error
      let errorMessage = 'Failed to create quiz';
      
      if (error instanceof Error) {
        if (error.message.includes('questionId')) {
          errorMessage = 'Error with quiz question structure. Please check all questions have required fields.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast.error(isEditMode ? `Failed to update quiz: ${errorMessage}` : errorMessage);
    }
  };

  // Format estimated time for display
  const formatTime = (minutes?: number): string => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Handle opening the problem dialog
  const handleAddProblem = () => {
    setSelectedProblem(null);
    setIsProblemEditMode(false);
    setProblemType('MULTIPLE_CHOICE');
    
    // Reset form fields
    setProblemText('');
    setProblemPoints(10);
    setProblemDifficulty('MEDIUM');
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
  
  // Handle editing an existing problem
  const handleEditProblem = (problem: McProblem | CodeProblem) => {
    setSelectedProblem(problem);
    setIsProblemEditMode(true);
    setProblemType(problem.questionType);
    
    // Set common fields
    setProblemText(problem.questionText);
    setProblemPoints(problem.points);
    setProblemDifficulty(problem.difficulty || 'MEDIUM');
    setProblemOrderNum(problem.orderNum);
    
    // Set type-specific fields
    if (problem.questionType === 'MULTIPLE_CHOICE') {
      const mcProblem = problem as McProblem;
      setMcOptions(mcProblem.options);
      setMcExplanation(mcProblem.explanation || '');
      setShuffleOptions(mcProblem.shuffleOptions !== false); // default to true if not specified
    } else {
      const codeProblem = problem as CodeProblem;
      setCodeLanguage(codeProblem.language);
      setCodeTemplate(codeProblem.codeTemplate || '');
      setFunctionName(codeProblem.functionName || '');
      setTimeLimit(codeProblem.timeLimit || 5000);
      setMemoryLimit(codeProblem.memoryLimit);
      setTestCases(codeProblem.testCases);
    }
    
    setShowProblemDialog(true);
  };
  
  // Handle closing the problem dialog
  const handleCloseProblemDialog = () => {
    setShowProblemDialog(false);
    setSelectedProblem(null);
  };
  
  // Save a problem to the quiz
  const handleSaveProblem = () => {
    // Validation
    if (!problemText.trim()) {
      toast.error("Problem text is required");
      return;
    }
    
    if (problemType === 'MULTIPLE_CHOICE') {
      // Validate MC options
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
      
      // Create MC problem
      const mcProblem: McProblem = {
        id: selectedProblem?.id,
        questionText: problemText,
        questionType: 'MULTIPLE_CHOICE',
        points: problemPoints,
        difficulty: problemDifficulty,
        orderNum: problemOrderNum,
        options: mcOptions.filter(opt => opt.text.trim()),
        explanation: mcExplanation || undefined,
        shuffleOptions: shuffleOptions
      };
      
      // Add/update problem in quiz problems array
      if (isProblemEditMode && selectedProblem) {
        setQuizProblems(prevProblems => 
          prevProblems.map(p => p.id === selectedProblem.id ? mcProblem : p)
        );
      } else {
        setQuizProblems(prevProblems => [...prevProblems, mcProblem]);
      }
      
    } else {
      // Validate Code problem
      if (!codeLanguage) {
        toast.error("Programming language is required");
        return;
      }
      
      const validTestCases = testCases.filter(tc => tc.input.trim() && tc.expectedOutput.trim());
      if (validTestCases.length === 0) {
        toast.error("At least one test case is required");
        return;
      }
      
      // Create Code problem
      const codeProblem: CodeProblem = {
        id: selectedProblem?.id,
        questionText: problemText,
        questionType: 'CODE',
        points: problemPoints,
        difficulty: problemDifficulty,
        orderNum: problemOrderNum,
        language: codeLanguage,
        codeTemplate: codeTemplate || undefined,
        functionName: functionName || undefined,
        timeLimit: timeLimit,
        memoryLimit: memoryLimit,
        testCases: validTestCases
      };
      
      // Add/update problem in quiz problems array
      if (isProblemEditMode && selectedProblem) {
        setQuizProblems(prevProblems => 
          prevProblems.map(p => p.id === selectedProblem.id ? codeProblem : p)
        );
      } else {
        setQuizProblems(prevProblems => [...prevProblems, codeProblem]);
      }
    }
    
    toast.success(isProblemEditMode ? "Problem updated" : "Problem added");
    handleCloseProblemDialog();
  };
  
  // Remove a problem from the quiz
  const handleRemoveProblem = (problem: McProblem | CodeProblem) => {
    setQuizProblems(prevProblems => 
      prevProblems.filter(p => p !== problem)
    );
    toast.success("Problem removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Quiz Editor</h2>
          <p className="text-muted-foreground mt-1">Manage quizzes for your learning path topics</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchLevels}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        // Loading state
        <div className="space-y-4">
          <Card>
            <CardContent className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/4"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : levels.length === 0 ? (
        // No levels found
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground text-center">
                No levels or topics found. Create learning path content first.
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
                  <CardTitle className="text-2xl">Level {level.name}</CardTitle>
                  <CardDescription>{level.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {level.topics.map((topic) => (
                    <Card key={topic.id} className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle>{topic.name}</CardTitle>
                          <CardDescription>{topic.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAddQuiz(topic)}
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Quiz
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="min-h-[100px]">
                        {isLoadingQuizzes[topic.id] ? (
                          <div className="animate-pulse space-y-4 p-4">
                            <div className="h-6 bg-muted rounded w-1/4"></div>
                            <div className="h-12 bg-muted rounded"></div>
                          </div>
                        ) : fetchErrors[topic.id] ? (
                          <div className="flex flex-col items-center justify-center p-6 border-2 border-red-200 rounded-lg gap-4">
                            <p className="text-red-500 text-center">
                              {fetchErrors[topic.id]}
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => fetchQuizzesForTopic(topic.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry
                            </Button>
                          </div>
                        ) : (quizzesByTopic[topic.id] && quizzesByTopic[topic.id].length > 0) ? (
                          <div className="space-y-3">
                            {quizzesByTopic[topic.id].map((quiz) => (
                              <div 
                                key={quiz.id} 
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="space-y-1">
                                  <div className="font-medium">{quiz.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    <Badge variant="outline" className="mr-2">
                                      {quiz._count?.questions || 0} questions
                                    </Badge>
                                    <span className="mr-2">
                                      Pass: {quiz.passingScore}%
                                    </span>
                                    {quiz.estimatedTime && (
                                      <span>Time: {formatTime(quiz.estimatedTime)}</span>
                                    )}
                                  </div>
                                  {quiz.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {quiz.description}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditQuiz(quiz, topic)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteClick(quiz)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-background">
                            <div className="text-center space-y-2">
                              <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">
                                No questions added yet. Click "Add Question" to start creating quiz questions.
                                {!isEditMode && <span className="block font-medium text-destructive mt-1">At least one question is required for new quizzes.</span>}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Remember to set the order for each problem to control their sequence in the quiz.
                              </p>
                            </div>
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
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? `Edit quiz for ${selectedTopic?.name || 'this topic'}.`
                : `Add a quiz to ${selectedTopic?.name || 'this topic'}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Quiz Name and Description */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Quiz Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter quiz name"
                  value={quizName}
                  onChange={(e) => setQuizName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter quiz description"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-order">
                  Display Order <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="display-order"
                  type="number"
                  placeholder="Enter display order"
                  value={quizOrderNum || ''}
                  onChange={(e) => setQuizOrderNum(e.target.value ? parseInt(e.target.value) : undefined)}
                  required
                />
              </div>
            </div>

            {/* Add Problems Section */}
            <div className="border rounded-md p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    Quiz Problems ({quizProblems.length}) {!isEditMode && <span className="text-destructive">*</span>}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="mr-2">
                      Multiple Choice: {quizProblems.filter(p => p.questionType === 'MULTIPLE_CHOICE').length}
                    </span>
                    <span>
                      Code: {quizProblems.filter(p => p.questionType === 'CODE').length}
                    </span>
                  </div>
                  {quizProblems.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {quizProblems.filter(p => p.orderNum !== undefined).length === quizProblems.length ? 
                        "✓ All problems have defined order" : 
                        "⚠️ Some problems missing order"
                      }
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  type="button" 
                  onClick={handleAddProblem}
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> 
                  Add Question
                </Button>
              </div>
              
              {isLoadingProblems ? (
                // Loading state for problems
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-background">
                  <div className="animate-pulse space-y-2 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading problems...</p>
                  </div>
                </div>
              ) : quizProblems.length > 0 ? (
                // Display existing problems
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {quizProblems.map((problem, index) => (
                    <div key={problem.id || index} className="border rounded-md p-3 bg-background">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <div className="font-medium flex items-center">
                            <span className="mr-2">
                              {problem.orderNum !== undefined ? 
                                <Badge variant="default" className="mr-2">#{problem.orderNum}</Badge> : 
                                <span>Problem {index + 1}:</span>
                              }
                            </span>
                            {problem.questionType === 'MULTIPLE_CHOICE' ? (
                              <Badge variant="secondary">Multiple Choice</Badge>
                            ) : (
                              <Badge variant="secondary">Code</Badge>
                            )}
                          </div>
                          <div className="text-sm">{problem.questionText}</div>
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditProblem(problem)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveProblem(problem)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Problem-specific details */}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {problem.questionType === 'MULTIPLE_CHOICE' ? (
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">Options:</div>
                            <div className="ml-2 space-y-1">
                              {(problem as McProblem).options.map((option, optIndex) => (
                                <div key={option.id || optIndex} className="flex items-start">
                                  <div className={`w-4 h-4 rounded-full mr-2 mt-0.5 ${option.isCorrect ? 'bg-green-500' : 'bg-muted'}`}></div>
                                  <span>{option.text}</span>
                                </div>
                              ))}
                            </div>
                            {(problem as McProblem).shuffleOptions === false && (
                              <div className="font-medium text-foreground mt-1">Options will not be shuffled</div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">Language: {(problem as CodeProblem).language}</div>
                            <div className="font-medium text-foreground">Test Cases: {(problem as CodeProblem).testCases.length}</div>
                            {(problem as CodeProblem).timeLimit && (
                              <div className="font-medium text-foreground">Time Limit: {(problem as CodeProblem).timeLimit}ms</div>
                            )}
                            {(problem as CodeProblem).memoryLimit && (
                              <div className="font-medium text-foreground">Memory Limit: {(problem as CodeProblem).memoryLimit}MB</div>
                            )}
                          </div>
                        )}
                        <div className="mt-1 font-medium text-foreground">Points: {problem.points}</div>
                        {problem.difficulty && (
                          <div className="font-medium text-foreground">Difficulty: {problem.difficulty}</div>
                        )}
                        {problem.orderNum !== undefined && (
                          <div className="font-medium text-foreground">Order: {problem.orderNum}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty state / placeholder
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-background">
                  <div className="text-center space-y-2">
                    <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No questions added yet. Click "Add Question" to start creating quiz questions.
                      {!isEditMode && <span className="block font-medium text-destructive mt-1">At least one question is required for new quizzes.</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Remember to set the order for each problem to control their sequence in the quiz.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Settings */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid items-center gap-2">
                <Label htmlFor="passing-score">
                  Passing Score (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="passing-score"
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                  required
                />
              </div>
              <div className="grid items-center gap-2">
                <Label htmlFor="estimated-time">
                  Estimated Time (minutes) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="estimated-time"
                  type="number"
                  value={estimatedTime || ''}
                  onChange={(e) => setEstimatedTime(e.target.value ? parseInt(e.target.value) : undefined)}
                  min={1}
                  placeholder="Enter estimated completion time"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuiz}>
              {isEditMode ? 'Update Quiz' : 'Create Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Problem Creation/Edit Dialog */}
      <Dialog open={showProblemDialog} onOpenChange={setShowProblemDialog}>
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
                
                <div className="space-y-2">
                  <Label htmlFor="problem-order">
                    Question Order <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="problem-order"
                    type="number"
                    value={problemOrderNum || ''}
                    onChange={(e) => setProblemOrderNum(e.target.value ? parseInt(e.target.value) : undefined)}
                    min={0}
                    placeholder="Order in quiz"
                    className="w-full"
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
                  <Label htmlFor="problem-difficulty">
                    Difficulty <span className="text-destructive">*</span>
                  </Label>
                  <Select value={problemDifficulty} onValueChange={setProblemDifficulty} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
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
                            const newOptions = [...mcOptions];
                            newOptions[index].isCorrect = !!checked;
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
                            setMcOptions(newOptions);
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
                    Explanation (Optional)
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
                  <input
                    type="checkbox"
                    id="shuffle-options"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="mr-2"
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
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-limit">
                    Time Limit (ms)
                  </Label>
                  <Input
                    id="time-limit"
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 5000)}
                    min={1000}
                    step={100}
                    placeholder="Execution time limit (ms)"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memory-limit">
                    Memory Limit (MB)
                  </Label>
                  <Input
                    id="memory-limit"
                    type="number"
                    value={memoryLimit || ''}
                    onChange={(e) => setMemoryLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    min={1}
                    placeholder="Memory limit (optional)"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Test Cases <span className="text-destructive">*</span>
                  </Label>
                  <div className="border rounded-md p-4 space-y-4">
                    {testCases.map((testCase, index) => (
                      <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                          {testCases.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newTestCases = testCases.filter((_, i) => i !== index);
                                setTestCases(newTestCases);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
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
                      className="w-full"
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
              {isProblemEditMode ? 'Update Problem' : 'Add Problem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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