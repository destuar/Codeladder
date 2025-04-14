import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Import the accordion components - comment out if they don't exist in your project
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { 
  RefreshCw, 
  Plus, 
  Pencil, 
  Trash, 
  AlertCircle, 
  ClipboardCheck, 
  Award, 
  Clock, 
  MessageSquare,
  Loader2,
  FileQuestion,
  FolderKanban as LevelIcon
} from 'lucide-react';

// Define interfaces for Topic and Level
interface Topic {
  id: string;
  name: string;
}

interface Level {
  id: string;
  name: string;
  order: number;
  description?: string;
  // Include tests array if the API provides it directly
  // tests?: Test[]; 
}

// Test interface for display and management
interface Test {
  id: string;
  name: string;
  description?: string;
  levelId: string;
  passingScore: number;
  estimatedTime?: number;
  orderNum?: number;
  assessmentType: 'TEST';
  createdAt: string;
  updatedAt: string;
  _count?: {
    questions: number;
  };
}

// Quiz Question interfaces
interface QuizQuestionBase {
  id?: string; // Optional for new questions
  quizId?: string; // The ID of the quiz/test this belongs to
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CODE';
  points: number;
  orderNum?: number;
  difficulty?: string;
}

interface McOption {
  id?: string; // Optional for new options
  text: string;
  isCorrect: boolean;
  explanation?: string | null;
  orderNum?: number;
}

interface McProblem extends QuizQuestionBase {
  questionType: 'MULTIPLE_CHOICE';
  explanation?: string | null;
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
  codeTemplate?: string | null;
  functionName?: string | null;
  timeLimit?: number;
  memoryLimit?: number | null;
  testCases: TestCase[];
}

// Union type representing a question in the state
type QuizQuestion = McProblem | CodeProblem;

/**
 * TestAdmin Component
 * 
 * Admin interface for managing tests in the platform.
 * This component allows administrators to create, edit, and manage tests,
 * including multiple choice and code-based questions.
 */
export function TestAdmin() {
  const { token } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [testsByLevel, setTestsByLevel] = useState<Record<string, Test[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [fetchErrors, setFetchErrors] = useState<Record<string, string | null>>({});
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();
  
  // Dialog states
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);

  // Test form state
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [testOrderNum, setTestOrderNum] = useState<number | undefined>(undefined);

  // Test problems state
  const [testProblems, setTestProblems] = useState<QuizQuestion[]>([]);
  const [initialTestProblems, setInitialTestProblems] = useState<QuizQuestion[]>([]); // Store initial state for comparison
  const [isLoadingProblems, setIsLoadingProblems] = useState(false); // Loading state for problems

  // Problem dialog state
  const [showProblemDialog, setShowProblemDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<QuizQuestion | null>(null);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number | null>(null); // Store index separately
  const [isProblemEditMode, setIsProblemEditMode] = useState(false);

  // Problem form state
  const [problemType, setProblemType] = useState<'MULTIPLE_CHOICE' | 'CODE'>('MULTIPLE_CHOICE');
  const [problemText, setProblemText] = useState('');
  const [problemPoints, setProblemPoints] = useState(10);
  const [problemDifficulty, setProblemDifficulty] = useState('MEDIUM');
  const [problemOrderNum, setProblemOrderNum] = useState<number | undefined>(undefined);

  // MC Problem specific state
  const [mcExplanation, setMcExplanation] = useState('');
  const [mcShuffle, setMcShuffle] = useState(true);
  const [mcOptions, setMcOptions] = useState<McOption[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  // Code Problem specific state
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeTemplate, setCodeTemplate] = useState('');
  const [codeFunctionName, setCodeFunctionName] = useState('');
  const [codeTimeLimit, setCodeTimeLimit] = useState(5000);
  const [codeMemoryLimit, setCodeMemoryLimit] = useState<number | undefined>(undefined);
  const [codeTestCases, setCodeTestCases] = useState<TestCase[]>([
    { input: '', expectedOutput: '', isHidden: false },
  ]);

  // Fetch levels and their associated tests on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setFetchErrors({});
      try {
        if (!token) throw new Error('Authentication token not found.');
        
        console.log("Fetching levels...");
        const fetchedLevels = await api.getLevels(token);
        
        if (!Array.isArray(fetchedLevels)) {
          console.error("Fetched levels is not an array:", fetchedLevels);
          throw new Error('Invalid data format for levels.');
        }
        
        setLevels(fetchedLevels);
        console.log(`Fetched ${fetchedLevels.length} levels`);

        // Now, fetch tests for each level
        console.log("Fetching tests for each level...");
        const testsPromises = fetchedLevels.map(level => 
          api.getTestsByLevel(level.id, token).catch(error => {
            // Handle error for individual level fetch gracefully
            console.error(`Error fetching tests for level ${level.id}:`, error);
            setFetchErrors(prev => ({ 
              ...prev, 
              [level.id]: error instanceof Error ? error.message : 'Failed to load tests' 
            }));
            toast.error(`Failed to load tests for level ${level.name || level.id}`);
            return []; // Return empty array on error for this level
          })
        );

        const testsResults = await Promise.all(testsPromises);
        
        const initialTestsState: Record<string, Test[]> = {};
        fetchedLevels.forEach((level, index) => {
          // Ensure the result for this level is an array
          initialTestsState[level.id] = Array.isArray(testsResults[index]) ? testsResults[index] : [];
        });
        
        setTestsByLevel(initialTestsState);
        console.log("Finished fetching tests for all levels.");

      } catch (error) {
        console.error('Error fetching initial data:', error);
        setFetchErrors(prev => ({ ...prev, levels: error instanceof Error ? error.message : 'Failed to load initial data' }));
        toast.error('Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Keep token as dependency

  // Fetch tests for a specific level
  const fetchTestsForLevel = async (levelId: string) => {
    if (!token) return;
    
    setFetchErrors(prev => ({ ...prev, [levelId]: null })); // Clear previous error for this level
    
    try {
      console.log(`[fetchTestsForLevel] Fetching tests for level: ${levelId}`); // Added log
      const tests = await api.getTestsByLevel(levelId, token);
      
      // --- Added Detailed Logging ---
      console.log(`[fetchTestsForLevel] Raw response for level ${levelId}:`, tests); 
      if (Array.isArray(tests)) {
        console.log(`[fetchTestsForLevel] Received ${tests.length} tests from API for level ${levelId}`);
        tests.forEach(test => console.log(`  - Test ID: ${test.id}, Name: ${test.name}`));
      } else {
        console.warn(`[fetchTestsForLevel] Received non-array response for level ${levelId}:`, tests);
      }
      // --- End Added Logging ---

      setTestsByLevel(prev => ({
        ...prev,
        [levelId]: Array.isArray(tests) ? tests : []
      }));
    } catch (error) {
      console.error(`[fetchTestsForLevel] Error fetching tests for level ${levelId}:`, error); // Added log prefix
      setFetchErrors(prev => ({ ...prev, [levelId]: error instanceof Error ? error.message : 'Failed to load tests' }));
      toast.error(`Failed to load tests for level ${levels.find(l => l.id === levelId)?.name || levelId}`);
      setTestsByLevel(prev => ({
        ...prev,
        [levelId]: [] // Set to empty on error
      }));
    }
  };

  // Open the test creation dialog
  const handleCreateTest = (level: Level) => {
    setIsEditMode(false);
    setSelectedLevel(level);
    setSelectedTest(null);
    
    // Reset form values
    setTestName('');
    setTestDescription('');
    setPassingScore(70);
    setEstimatedTime(undefined);
    setTestOrderNum(undefined);
    
    // Reset problems
    setTestProblems([]);
    setInitialTestProblems([]);
    setIsLoadingProblems(false);
    
    setShowTestDialog(true);
  };

  // Open the test edit dialog
  const handleEditTest = (test: Test) => {
    setIsEditMode(true);
    setSelectedTest(test);
    
    // Set form values based on the selected test
    setTestName(test.name);
    setTestDescription(test.description || '');
    setPassingScore(test.passingScore || 70);
    setEstimatedTime(test.estimatedTime);
    setTestOrderNum(test.orderNum);
    
    // Find the level this test belongs to
    const level = levels.find(level => level.id === test.levelId);
    if (level) {
      setSelectedLevel(level);
    }
    
    // Reset validation errors
    setFetchErrors({});
    
    // Fetch the test questions
    setIsLoadingProblems(true);
    setTestProblems([]); // Reset current problems
    setInitialTestProblems([]); // Reset initial problems
    
    // Use the API to get the test questions
    if (test.id && token) {
      api.getQuizQuestions(test.id, token)
        .then(response => {
          console.log('Fetched test questions:', response);
          // Ensure response is treated as QuizQuestion[] which is McProblem[] | CodeProblem[]
          const fetchedQuestions: QuizQuestion[] = Array.isArray(response) ? response : [];
          setTestProblems(fetchedQuestions); // Set current problems
          setInitialTestProblems(fetchedQuestions); // Set initial problems
        })
        .catch(error => {
          console.error('Error fetching test questions:', error);
          toast.error('Failed to load test questions');
          setTestProblems([]);
          setInitialTestProblems([]);
        })
        .finally(() => {
          setIsLoadingProblems(false);
        });
    } else {
      // If no test ID, just initialize with empty array
      setTestProblems([]);
      setInitialTestProblems([]);
      setIsLoadingProblems(false);
    }
    
    // Open the dialog
    setShowTestDialog(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (test: Test) => {
    setTestToDelete(test);
    setShowDeleteDialog(true);
  };

  // Close the test creation/edit dialog
  const handleCloseDialog = () => {
    setShowTestDialog(false);
    setSelectedLevel(null);
    setSelectedTest(null);
    setTestProblems([]);
  };

  // Delete a test
  const handleDeleteTest = async () => {
    if (!testToDelete || !token) {
      console.log("Delete prerequisites not met:", { hasTestToDelete: !!testToDelete, hasToken: !!token });
      return;
    }
    
    // Maybe use a specific deleting state later if needed
    // setIsLoading(true); 
    console.log(`[handleDeleteTest] Initiating delete for test ID: ${testToDelete.id}, Name: ${testToDelete.name}`); // Added log

    try {
      // Correct the API endpoint path
      const deletePath = `/quizzes/${testToDelete.id}`; 
      console.log(`[handleDeleteTest] Calling API DELETE on path: ${deletePath}`); // Added log
      
      await api.delete(deletePath, token); // Using the corrected path
      
      console.log(`[handleDeleteTest] Successfully deleted test ID: ${testToDelete.id} via API`); // Added log
      
      // Remove the deleted test from the state
      const levelIdToDeleteFrom = testToDelete.levelId; // Store before nulling testToDelete
      setTestsByLevel(prev => {
        const updatedTests = { ...prev };
        if (levelIdToDeleteFrom && updatedTests[levelIdToDeleteFrom]) {
          updatedTests[levelIdToDeleteFrom] = updatedTests[levelIdToDeleteFrom].filter(t => t.id !== testToDelete.id);
          console.log(`[handleDeleteTest] Removed test ${testToDelete.id} from frontend state for level ${levelIdToDeleteFrom}`); // Added log
        } else {
           console.warn(`[handleDeleteTest] Could not find level ${levelIdToDeleteFrom} in state to remove test from.`);
        }
        return updatedTests;
      });
      
      // Show success message
      toast.success(`Test "${testToDelete.name}" deleted successfully`);
      
      // Close delete confirmation AFTER state update and toast
      setShowDeleteDialog(false);
      setTestToDelete(null);
      
      // No need to call fetchTestsForLevel if the state update works correctly
      // Refresh tests for the level (Optional, uncomment if state update is unreliable)
      // if (levelIdToDeleteFrom) {
      //   console.log(`[handleDeleteTest] Refreshing tests for level ${levelIdToDeleteFrom} after deletion.`); // Add log
      //   fetchTestsForLevel(levelIdToDeleteFrom); 
      // }

    } catch (error) {
      console.error('[handleDeleteTest] Error deleting test:', error); // Added log prefix
      // Log the specific error from the API if available
      if (error instanceof Error && (error as any).response) {
          console.error('[handleDeleteTest] API Error Response:', (error as any).response);
      } else if (error instanceof Error) {
          console.error('[handleDeleteTest] Error Details:', error.message, error.stack);
      }
      toast.error(`Failed to delete test "${testToDelete?.name}". Please check console for details.`);
    } finally {
      // Maybe use a specific deleting state later if needed
      // setIsLoading(false); 
    }
  };

  // Save (create/update) a test
  const handleSaveTest = async () => {
    console.log('[handleSaveTest] Function called.'); // Added log
    console.log('[handleSaveTest] Checking prerequisites:', { 
      hasSelectedLevel: !!selectedLevel, 
      hasToken: !!token 
    }); // Added log
    
    // --- Early Exit Check ---
    if (!selectedLevel || !token) {
      console.error('[handleSaveTest] Save prerequisites not met.', { 
        selectedLevel: selectedLevel ? selectedLevel.id : null, 
        tokenExists: !!token 
      });
      toast.error("Cannot save: Missing level context or authentication token.");
      return; 
    }
    
    console.log('[handleSaveTest] Prerequisites met. Starting frontend validation...'); // Added log
    
    // Enhanced validation - collect all validation errors
    const errors = [];
    
    if (!testName.trim()) {
      errors.push("Test name is required");
    }
    
    if (passingScore < 0 || passingScore > 100) {
      errors.push("Passing score must be between 0 and 100");
    }
    
    if (estimatedTime !== undefined && estimatedTime !== null && (estimatedTime <= 0 || isNaN(estimatedTime))) {
      errors.push("Estimated time must be a positive number if provided");
    }
    
    // If we're in create mode, require at least one question
    if (!isEditMode && testProblems.length === 0) {
      errors.push("Test must have at least one question");
    }
    
    // Display all validation errors if any
    if (errors.length > 0) {
      console.log('[handleSaveTest] Frontend validation failed:', errors); // Added log
      errors.forEach(error => toast.error(error));
      return;
    }
    
    console.log('[handleSaveTest] Frontend validation passed. Attempting backend validation...'); // Added log

    try {
      // Prep test metadata (without the questions)
      const testData = {
        name: testName,
        description: testDescription || undefined,
        levelId: selectedLevel.id,
        passingScore,
        estimatedTime,
        orderNum: testOrderNum,
        assessmentType: 'TEST' as const
      };
      
      // Debug the test data
      console.log('Prepared test metadata:', testData);
      
      // First validate the test data on the server
      toast.info("Validating test data...");
      const validationResult = await api.validateTest(testData, token);
      
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
        
        toast.error("Please fix the errors before saving the test");
        return;
      }
      
      // Step 1: Save test metadata
      toast.info("Saving test...");
      
      let testId: string;
      
      if (isEditMode && selectedTest) {
        // Update existing test
        const response = await api.updateAssessment(selectedTest.id, testData, token);
        toast.success('Test updated successfully');
        testId = selectedTest.id;
      } else {
        // Create new test
        const response = await api.createAssessment(testData, token);
        toast.success('Test created successfully');
        testId = response.id;
      }
      
      // Step 2: Handle questions - create/update/delete as needed
      
      // Start by preparing the questions
      const preparedProblems = testProblems.map((problem, index) => {
        // Common preparation for all problem types
        const baseProblem = {
          id: problem.id, // Keep track of existing IDs
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
                id: option.id, // Keep track of existing option IDs
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
                id: testCase.id, // Keep track of existing test case IDs
                input: testCase.input.trim() || '',
                expectedOutput: testCase.expectedOutput.trim() || '',
                isHidden: Boolean(testCase.isHidden),
                orderNum: testCase.orderNum || tcIndex + 1
              }))
          };
        }
        
        return baseProblem; // Fallback
      });
      
      // Now we need to determine what to create, update, or delete
      
      // 1. If in edit mode, identify deleted questions
      let deletedQuestionIds: string[] = [];
      
      if (isEditMode) {
        // Get all existing question IDs
        const existingQuestionIds = initialTestProblems
          .filter(q => q.id) // Only consider questions with IDs (ones that exist in the DB)
          .map(q => q.id) as string[];
        
        // Get all current question IDs being kept
        const currentQuestionIds = preparedProblems
          .filter(q => q.id) // Only consider questions with IDs (ones that exist in the DB)
          .map(q => q.id) as string[];
        
        // Find IDs that were in the initial set but are no longer in the current set
        deletedQuestionIds = existingQuestionIds.filter(id => !currentQuestionIds.includes(id));
      }
      
      // 2. Process the questions - delete, then create/update
      
      // First, delete removed questions
      if (deletedQuestionIds.length > 0) {
        toast.info(`Deleting ${deletedQuestionIds.length} question(s)...`);
        
        const deletePromises = deletedQuestionIds.map(questionId =>
          api.deleteQuizQuestion(questionId, token)
        );
        
        try {
          await Promise.all(deletePromises);
          console.log(`Successfully deleted ${deletedQuestionIds.length} questions`);
        } catch (error) {
          console.error('Error deleting questions:', error);
          toast.error(`Failed to delete some questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Now create/update questions
      if (preparedProblems.length > 0) {
        toast.info(`Saving ${preparedProblems.length} question(s)...`);
        
        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        // Process one by one to handle errors better
        for (const problem of preparedProblems) {
          try {
            // Determine if this is a create or update
            if (problem.id) {
              // Update existing question
              await api.updateTestQuestion(problem.id, problem, token);
              updatedCount++;
            } else {
              // Create new question
              await api.createQuizQuestion(testId, problem, token);
              createdCount++;
            }
          } catch (error) {
            console.error('Error saving question:', error);
            errorCount++;
          }
        }
        
        // Summarize results
        if (errorCount === 0) {
          if (createdCount > 0 && updatedCount > 0) {
            toast.success(`Created ${createdCount} and updated ${updatedCount} questions`);
          } else if (createdCount > 0) {
            toast.success(`Created ${createdCount} question(s)`);
          } else if (updatedCount > 0) {
            toast.success(`Updated ${updatedCount} question(s)`);
          }
        } else {
          const successCount = createdCount + updatedCount;
          if (successCount > 0) {
            toast.warning(`Saved ${successCount} question(s), but ${errorCount} failed`);
          } else {
            toast.error(`Failed to save all ${errorCount} question(s)`);
          }
        }
      }
      
      // Refresh tests for the level
      fetchTestsForLevel(selectedLevel.id);
      
      // Close the dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving test:', error);
      
      // Provide more helpful error message based on the error
      let errorMessage = 'Failed to save test';
      
      if (error instanceof Error) {
        if (error.message.includes('questionId')) {
          errorMessage = 'Error with test question structure. Please check all questions have required fields.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast.error(isEditMode ? `Failed to update test: ${errorMessage}` : errorMessage);
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
    setMcShuffle(true);
    setCodeLanguage('javascript');
    setCodeTemplate('');
    setCodeFunctionName('');
    setCodeTimeLimit(5000);
    setCodeMemoryLimit(undefined);
    setCodeTestCases([
      { input: '', expectedOutput: '', isHidden: false }
    ]);
    
    setShowProblemDialog(true);
  };
  
  // Open the problem editing dialog
  const handleEditProblem = (problem: QuizQuestion, index: number) => {
    setSelectedProblem({ ...problem }); // Store the problem data
    setSelectedProblemIndex(index);    // Store the index separately
    setIsProblemEditMode(true);

    // Set common fields
    setProblemType(problem.questionType);
    setProblemText(problem.questionText);
    setProblemPoints(problem.points);
    setProblemDifficulty(problem.difficulty || 'MEDIUM');
    setProblemOrderNum(problem.orderNum);

    // Set type-specific fields
    if (problem.questionType === 'MULTIPLE_CHOICE') {
      setMcOptions(problem.options.map(opt => ({ ...opt })) || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
      setMcExplanation(problem.explanation || '');
      setMcShuffle(problem.shuffleOptions !== false);
      // Reset code fields
      setCodeLanguage('javascript');
      setCodeTemplate('');
      setCodeFunctionName('');
      setCodeTimeLimit(5000);
      setCodeMemoryLimit(undefined);
      setCodeTestCases([{ input: '', expectedOutput: '', isHidden: false }]);
    } else {
      // Reset MC fields
      setMcOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
      setMcExplanation('');
      setMcShuffle(true);
      // Set CODE fields
      setCodeLanguage(problem.language || 'javascript');
      setCodeTemplate(problem.codeTemplate || '');
      setCodeFunctionName(problem.functionName || ''); // Provide default empty string
      setCodeTimeLimit(problem.timeLimit || 5000);
      setCodeMemoryLimit(problem.memoryLimit || undefined); // Provide default undefined
      setCodeTestCases(problem.testCases.map(tc => ({ ...tc })) || [{ input: '', expectedOutput: '', isHidden: false }]);
    }

    setShowProblemDialog(true);
  };
  
  // Handle closing the problem dialog
  const handleCloseProblemDialog = () => {
    setShowProblemDialog(false);
    setSelectedProblem(null);
  };
  
  // Save a problem to the test
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
        shuffleOptions: mcShuffle
      };
      
      // Add/update problem in test problems array
      if (isProblemEditMode && selectedProblem) {
        setTestProblems(prevProblems => 
          prevProblems.map(p => p.id === selectedProblem.id ? mcProblem : p)
        );
      } else {
        setTestProblems(prevProblems => [...prevProblems, mcProblem]);
      }
      
    } else {
      // Validate Code problem
      if (!codeLanguage) {
        toast.error("Programming language is required");
        return;
      }
      
      const validTestCases = codeTestCases.filter(tc => tc.input.trim() && tc.expectedOutput.trim());
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
        functionName: codeFunctionName || undefined,
        timeLimit: codeTimeLimit,
        memoryLimit: codeMemoryLimit,
        testCases: validTestCases
      };
      
      // Add/update problem in test problems array
      if (isProblemEditMode && selectedProblem) {
        setTestProblems(prevProblems => 
          prevProblems.map(p => p.id === selectedProblem.id ? codeProblem : p)
        );
      } else {
        setTestProblems(prevProblems => [...prevProblems, codeProblem]);
      }
    }
    
    toast.success(isProblemEditMode ? "Problem updated" : "Problem added");
    handleCloseProblemDialog();
  };
  
  // Remove a problem from the test
  const handleRemoveProblem = (problem: McProblem | CodeProblem) => {
    setTestProblems(prevProblems => 
      prevProblems.filter(p => p !== problem)
    );
    toast.success("Problem removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Test Editor</h2>
          <p className="text-muted-foreground mt-1">Manage tests for your learning path levels</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center"
          onClick={() => {
            // Refresh the levels data
            const fetchInitialData = async () => {
              setIsLoading(true);
              try {
                if (!token) throw new Error('Authentication token not found.');
                const fetchedLevels = await api.getLevels(token);
                if (Array.isArray(fetchedLevels)) {
                  setLevels(fetchedLevels);
                  // Also refresh test data for each level
                  fetchedLevels.forEach(level => fetchTestsForLevel(level.id));
                }
              } catch (error) {
                console.error('Error refreshing data:', error);
                toast.error('Failed to refresh data');
              } finally {
                setIsLoading(false);
              }
            };
            fetchInitialData();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
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
                No levels found. Create learning path content first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Display tests by level
        <div className="space-y-6">
          {levels.map((level) => (
            <Card key={level.id}>
              <CardHeader className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">{level.name} Tests</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                    onClick={() => handleCreateTest(level)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Test
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="px-2 pt-2 pb-4">
                {/* Error state for this level */}
                {fetchErrors[level.id] && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{fetchErrors[level.id]}</AlertDescription>
                  </Alert>
                )}

                {/* Tests for this level */}
                <div>
                  {/* Loading state */}
                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (testsByLevel[level.id]?.length || 0) === 0 ? (
                    /* Empty state */
                    <div className="py-2 text-center">
                      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No tests yet for this level.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleCreateTest(level)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Test
                      </Button>
                    </div>
                  ) : (
                    /* Test list */
                    <div className="space-y-2 py-2">
                      {testsByLevel[level.id]?.map((test) => (
                        <Card key={test.id} className="relative overflow-hidden">
                          {/* Test item */}
                          <div className="p-3 flex items-center justify-between">
                            {/* Test info */}
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center">
                                <ClipboardCheck className="h-4 w-4 mr-2 text-neutral-500 dark:text-neutral-400" />
                                <h4 className="font-medium truncate">{test.name}</h4>
                              </div>
                              
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center">
                                  <Award className="h-3.5 w-3.5 mr-1" />
                                  <span>Pass: {test.passingScore}%</span>
                                </div>
                                
                                {test.estimatedTime && (
                                  <div className="flex items-center">
                                    <Clock className="h-3.5 w-3.5 mr-1" />
                                    <span>{formatTime(test.estimatedTime)}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center">
                                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                  <span>
                                    {test._count?.questions || 0} {(test._count?.questions || 0) === 1 ? 'Question' : 'Questions'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTest(test)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(test)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Test' : 'Create New Test'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Edit the test details and questions.' 
                : 'Add a new test to help assess student understanding.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Test editing form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="test-name">Test Name</Label>
                <Input 
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Enter test name"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="test-description">Description (Optional)</Label>
                <Textarea
                  id="test-description"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Enter a brief description of this test"
                />
              </div>
              <div>
                <Label htmlFor="passing-score">Passing Score (%)</Label>
                <Input
                  id="passing-score"
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="estimated-time">Estimated Time (minutes)</Label>
                <Input
                  id="estimated-time"
                  type="number"
                  min={1}
                  value={estimatedTime === null ? '' : (estimatedTime || '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Set to undefined if empty or invalid, otherwise parse
                    setEstimatedTime(value === '' ? undefined : parseInt(value, 10));
                  }}
                  placeholder="Optional"
                />
              </div>
            </div>
            
            {/* Problems Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Test Questions</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddProblem}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </div>
              
              {isLoadingProblems ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-14 bg-muted rounded-md"></div>
                  <div className="h-14 bg-muted rounded-md"></div>
                </div>
              ) : testProblems.length === 0 ? (
                <div className="border-2 border-dashed rounded-md p-8 text-center">
                  <FileQuestion className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No questions added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add questions to this test using the button above
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleAddProblem}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {testProblems.map((problem, index) => (
                    <div 
                      key={problem.id || index} 
                      className="flex items-center justify-between border rounded-md p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={problem.questionType === 'MULTIPLE_CHOICE' ? 'secondary' : 'outline'}>
                            {problem.questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Code'}
                          </Badge>
                          <Badge variant="outline">{problem.points} pts</Badge>
                          <Badge variant="outline">{problem.difficulty}</Badge>
                          {problem.orderNum && (
                            <Badge variant="outline">Order: {problem.orderNum}</Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2">{problem.questionText}</p>
                        {problem.questionType === 'MULTIPLE_CHOICE' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(problem as McProblem).options.length} options, 
                            {(problem as McProblem).options.filter(opt => opt.isCorrect).length} correct
                          </p>
                        )}
                        {problem.questionType === 'CODE' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(problem as CodeProblem).language}, 
                            {(problem as CodeProblem).testCases?.length || 0} test cases
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProblem(problem, index)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProblem(problem)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTest}>
              {isEditMode ? 'Update Test' : 'Create Test'}
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
              This will permanently delete the test 
              "{testToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Problem Dialog */}
      <Dialog open={showProblemDialog} onOpenChange={setShowProblemDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isProblemEditMode ? 'Edit Question' : 'Add New Question'}
            </DialogTitle>
            <DialogDescription>
              {isProblemEditMode 
                ? 'Edit the question details below.' 
                : 'Create a new question for the test.'}
            </DialogDescription>
          </DialogHeader>
          
          {/* *** ADDED Tabs Structure *** */}
          <Tabs 
            value={problemType.toLowerCase().replace('_', '-')} 
            onValueChange={(val) => {
              if (val === 'multiple-choice') setProblemType('MULTIPLE_CHOICE');
              else if (val === 'code') setProblemType('CODE');
            }}
            className="w-full mt-4" // Added mt-4
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="multiple-choice" disabled={isProblemEditMode}>Multiple Choice</TabsTrigger>
              <TabsTrigger value="code" disabled={isProblemEditMode}>Code Problem</TabsTrigger>
            </TabsList>

            {/* Common fields remain outside tabs but within a div below */}
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="question-text">Question Text</Label>
                <Textarea
                  id="question-text"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="Enter the question text here..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                 {/* Points, Difficulty, Order */}
                 <div>
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    value={problemPoints}
                    onChange={(e) => setProblemPoints(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={problemDifficulty} 
                    onValueChange={(value) => setProblemDifficulty(value)}
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order-num">Order (Optional)</Label>
                  <Input
                    id="order-num"
                    type="number"
                    min={1}
                    value={problemOrderNum === null ? '' : problemOrderNum || ''}
                    onChange={(e) => setProblemOrderNum(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Auto"
                  />
                </div>
              </div>
            </div>
            
            {/* *** Multiple Choice Tab Content *** */}
            <TabsContent value="multiple-choice" className="mt-4 space-y-4">
              {/* MC specific fields */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Answer Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMcOptions([...mcOptions, { text: '', isCorrect: false }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Option
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
                    {mcOptions.map((option, index) => (
                      <div key={index} className="flex items-start gap-2 border rounded-md p-2">
                        <Checkbox
                          id={`option-correct-${index}`}
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => {
                            const newOptions = [...mcOptions];
                            newOptions[index].isCorrect = !!checked;
                            setMcOptions(newOptions);
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <Label htmlFor={`option-correct-${index}`} className="mr-2">
                              Correct Answer
                            </Label>
                          </div>
                          <Textarea
                            value={option.text}
                            onChange={(e) => {
                              const newOptions = [...mcOptions];
                              newOptions[index].text = e.target.value;
                              setMcOptions(newOptions);
                            }}
                            placeholder="Enter option text"
                            className="min-h-[60px]"
                          />
                          <Input 
                            value={option.explanation || ''}
                            onChange={(e) => {
                              const newOptions = [...mcOptions];
                              newOptions[index].explanation = e.target.value;
                              setMcOptions(newOptions);
                            }}
                            placeholder="Explanation (optional)"
                            className="mt-2"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (mcOptions.length > 2) {
                              setMcOptions(mcOptions.filter((_, i) => i !== index));
                            } else {
                              toast.error("At least 2 options are required");
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="explanation">Global Explanation (Optional)</Label>
                  <Textarea
                    id="explanation"
                    value={mcExplanation}
                    onChange={(e) => setMcExplanation(e.target.value)}
                    placeholder="Enter an explanation for the correct answer"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffle-options"
                    checked={mcShuffle}
                    onCheckedChange={(checked) => setMcShuffle(!!checked)}
                  />
                  <Label htmlFor="shuffle-options">
                    Shuffle answer options for each student
                  </Label>
                </div>
             </TabsContent>

            {/* *** Code Tab Content *** */}
            <TabsContent value="code" className="mt-4 space-y-4">
              {/* Code problem specific fields */}
                <div>
                  <Label htmlFor="language">Programming Language</Label>
                  <Select 
                    value={codeLanguage} 
                    onValueChange={setCodeLanguage}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
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
                  <Label htmlFor="code-template">Code Template (Optional)</Label>
                  <Textarea
                    id="code-template"
                    value={codeTemplate}
                    onChange={(e) => setCodeTemplate(e.target.value)}
                    placeholder="// Starter code that will be provided to the student"
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="function-name">Function Name (Optional)</Label>
                  <Input
                    id="function-name"
                    value={codeFunctionName}
                    onChange={(e) => setCodeFunctionName(e.target.value)}
                    placeholder="e.g., calculateSum"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {/* Time/Memory Limits */} 
                  <div>
                    <Label htmlFor="time-limit">Time Limit (ms)</Label>
                    <Input
                      id="time-limit"
                      type="number"
                      min={1000}
                      value={codeTimeLimit}
                      onChange={(e) => setCodeTimeLimit(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="memory-limit">Memory Limit (MB, Optional)</Label>
                    <Input
                      id="memory-limit"
                      type="number"
                      min={1}
                      value={codeMemoryLimit === null ? '' : codeMemoryLimit || ''}
                      onChange={(e) => setCodeMemoryLimit(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Test Cases</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCodeTestCases([...codeTestCases, { input: '', expectedOutput: '', isHidden: false }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Test Case
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto p-1">
                    {codeTestCases.map((testCase, index) => (
                      <div key={index} className="border rounded-md p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Test Case #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (codeTestCases.length > 1) {
                                setCodeTestCases(codeTestCases.filter((_, i) => i !== index));
                              } else {
                                toast.error("At least one test case is required");
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div>
                          <Label htmlFor={`input-${index}`}>Input</Label>
                          <Textarea
                            id={`input-${index}`}
                            value={testCase.input}
                            onChange={(e) => {
                              const newTestCases = [...codeTestCases];
                              newTestCases[index].input = e.target.value;
                              setCodeTestCases(newTestCases);
                            }}
                            placeholder="Enter input data"
                            className="font-mono text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`output-${index}`}>Expected Output</Label>
                          <Textarea
                            id={`output-${index}`}
                            value={testCase.expectedOutput}
                            onChange={(e) => {
                              const newTestCases = [...codeTestCases];
                              newTestCases[index].expectedOutput = e.target.value;
                              setCodeTestCases(newTestCases);
                            }}
                            placeholder="Enter expected output"
                            className="font-mono text-sm"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`hidden-${index}`}
                            checked={testCase.isHidden}
                            onCheckedChange={(checked) => {
                              const newTestCases = [...codeTestCases];
                              newTestCases[index].isHidden = !!checked;
                              setCodeTestCases(newTestCases);
                            }}
                          />
                          <Label htmlFor={`hidden-${index}`}>
                            Hidden test case (not shown to students)
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </TabsContent>
            {/* *** End Tabs Content *** */}
          </Tabs> 
          {/* *** End Tabs Wrapper *** */}
          
          <DialogFooter>
             <Button variant="outline" onClick={handleCloseProblemDialog}>Cancel</Button>
             <Button onClick={handleSaveProblem}>
              {isProblemEditMode ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section to display and manage tests for the selected level */}
      {selectedLevel && (
        <Card className="mt-6 flex-1">
          <CardHeader>
            <CardTitle className="text-xl">
              {selectedLevel ? `${selectedLevel.name} Tests` : 'Select a Level to Manage Tests'}
            </CardTitle>
            <CardDescription>
              Manage tests for the selected level: {selectedLevel.name}. Add new tests or edit existing ones.
            </CardDescription>
          </CardHeader>
          {/* Tests for this level */}
          <div>
            {/* Loading state */}
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (testsByLevel[selectedLevel.id]?.length || 0) === 0 ? (
              /* Empty state */
              <div className="py-2 text-center">
                <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No tests yet for this level.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleCreateTest(selectedLevel)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Test
                </Button>
              </div>
            ) : (
              /* Test list */
              <div className="space-y-2 py-2">
                {testsByLevel[selectedLevel.id]?.map((test) => (
                  <Card key={test.id} className="relative overflow-hidden">
                    {/* Test item */}
                    <div className="p-3 flex items-center justify-between">
                      {/* Test info */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center">
                          <ClipboardCheck className="h-4 w-4 mr-2 text-neutral-500 dark:text-neutral-400" />
                          <h4 className="font-medium truncate">{test.name}</h4>
                        </div>
                        
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Award className="h-3.5 w-3.5 mr-1" />
                            <span>Pass: {test.passingScore}%</span>
                          </div>
                          
                          {test.estimatedTime && (
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              <span>{formatTime(test.estimatedTime)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            <span>
                              {test._count?.questions || 0} {(test._count?.questions || 0) === 1 ? 'Question' : 'Questions'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTest(test)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(test)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default TestAdmin; 