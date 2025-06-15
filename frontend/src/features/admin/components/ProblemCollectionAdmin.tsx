import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Problem, Difficulty as ProblemDifficulty, ProblemType, CodeProblemType as AdminCodeProblemType, TestCase as AdminTestCase, Collection } from '@/features/problems/types';
import {
  LanguageSupport,
  defaultSupportedLanguages,
  prepareLanguageSupport,
  SupportedLanguage,
  LanguageData,
} from '@/features/languages/components/LanguageSupport';
import { PlusCircle, Trash, Edit, RefreshCw, FileJson, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingCard, LoadingSpinner, PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { validateAndParseProblemJSON, ValidationResult, ProblemJSONImport } from '../utils/problemJSONParser';
import { Level, Topic } from '@/hooks/useLearningPath';

// Local type for managing test cases in the form
interface FormTestCase {
  id?: string; 
  input: string; // Stringified JSON
  expected: string; // Stringified JSON for the form
  isHidden: boolean;
}

// Type for what the API expects for a test case (part of overall problem payload, not directly AdminCodeProblemType)
interface ApiSubmittedTestCase {
  input: string; 
  expectedOutput: string; // API expects 'expectedOutput'
  isHidden: boolean;
}

type FunctionParameter = {
  id?: string;
  name: string;
  type: string;
  description?: string;
};

// State for the 'codeProblem' part of the form, aligned with AdminCodeProblemType
type FormCodeProblemState = Omit<AdminCodeProblemType, 'testCases'> & {
  testCases?: FormTestCase[]; // UI uses FormTestCase
};

type NewProblemFormState = {
  name: string;
  content: string;
  difficulty: ProblemDifficulty;
  problemType: ProblemType;
  codeProblem?: FormCodeProblemState;
  return_type?: string;
  params?: FunctionParameter[];
  estimatedTime?: number;
  slug?: string;
  collectionIds?: string[];
  topicId?: string | null;
  required?: boolean;
  reqOrder?: number;
};

type EditProblemFormState = NewProblemFormState & {
  id: string;
  collectionIds: string[];
};

const difficultyLevels: ProblemDifficulty[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD'];

// Converts API AdminTestCase to FormTestCase
// AdminTestCase (from problems/types) has { input: any[], expected: any }
// Fetched problemDetails.codeProblem.testCases might have { input: ..., expectedOutput: ..., isHidden: ... }
// This function handles the conversion carefully to avoid double-stringifying values like true -> "true" -> "\"true\""
const normalizeAdminTestCaseToFormTestCase = (apiTestCase: any): FormTestCase => {
  // Handle input with the same logic as expected output to ensure consistency
  const getInputString = (inputValue: any): string => {
    if (inputValue === undefined || inputValue === null) return '';
    
    // If it's already a string, check if it's a JSON string that should be simplified
    if (typeof inputValue === 'string') {
      try {
        // Try to parse the string as JSON
        const parsed = JSON.parse(inputValue);
        
        // If it parses to a primitive value, return the simpler representation
        if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean' || parsed === null) {
          return String(parsed);
        }
        
        // If it's an object or array, return the original string (it's properly formatted JSON)
        return inputValue;
      } catch (e) {
        // If it doesn't parse as JSON, it's just a regular string, return as-is
        return inputValue;
      }
    }
    
    // For non-string values, stringify them
    return JSON.stringify(inputValue);
  };
  
  const inputStr = getInputString(apiTestCase.input);

  // Correctly handle expected output to avoid double-stringifying
  const getExpectedString = (expectedValue: any): string => {
    if (expectedValue === undefined || expectedValue === null) return '';
    
    // If it's already a string, check if it's a JSON string that should be simplified
    if (typeof expectedValue === 'string') {
      try {
        // Try to parse the string as JSON
        const parsed = JSON.parse(expectedValue);
        
        // If it parses to a primitive value (not an object/array), return the simpler representation
        if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean' || parsed === null) {
          return String(parsed);
        }
        
        // If it's an object or array, return the original string (it's properly formatted JSON)
        return expectedValue;
      } catch (e) {
        // If it doesn't parse as JSON, it's just a regular string, return as-is
        return expectedValue;
      }
    }
    
    // For non-string values, stringify them
    return JSON.stringify(expectedValue);
  };
  
  const expectedStr = getExpectedString(apiTestCase.expectedOutput ?? apiTestCase.expected);

  return {
    id: apiTestCase.id, // if present from API
    input: inputStr,
    expected: expectedStr, // This will be used by the form's Textarea
    isHidden: !!apiTestCase.isHidden, // Ensure boolean
  };
};

// Converts FormTestCase (stringified) to AdminTestCase (any[] input, any expected)
// This is used when constructing the AdminCodeProblemType object for the problem state (if needed for internal state before API submission)
// The AdminTestCase type from problems/types has `expected` not `expectedOutput`.
const prepareFormTestCaseForAdminCodeProblemType = (formTC: FormTestCase): AdminTestCase => {
  try {
    return {
      input: JSON.parse(formTC.input),
      expected: JSON.parse(formTC.expected), // Maps form's 'expected' to AdminTestCase's 'expected'
    };
  } catch (e) {
    console.error("Error parsing FormTestCase input/expected for AdminCodeProblemType:", e);
    return { input: [], expected: null }; 
  }
};

// Converts FormTestCase to what the API submission expects for a test case (stringified + isHidden)
// This function ensures that values are properly formatted before being sent to the API
const prepareFormTestCaseForApiSubmission = (formTC: FormTestCase): ApiSubmittedTestCase => {
  // Clean up the input and expected values to ensure they're properly formatted JSON
  const cleanJsonString = (value: string): string => {
    if (!value.trim()) return '';
    
    try {
      // Try to parse the value first to see if it's already valid JSON
      const parsed = JSON.parse(value);
      // If it parsed successfully, the value is already properly formatted JSON
      return value;
    } catch (e) {
      // If it's not valid JSON, treat it as a string literal and stringify it
      return JSON.stringify(value);
    }
  };

  return {
    input: cleanJsonString(formTC.input), 
    expectedOutput: cleanJsonString(formTC.expected), // Clean and properly format the expected output without double-stringifying
    isHidden: formTC.isHidden,
  };
};


const parseParams = (params: any): FunctionParameter[] => {
  if (!params) return [];
  if (typeof params === 'string') {
    try {
      const parsed = JSON.parse(params);
      return Array.isArray(parsed) ? parsed.map(p => ({id: p.id, name: p.name, type: p.type, description: p.description})) : [];
    } catch (error) {
      console.error("Error parsing params:", error);
      return [];
    }
  }
  return Array.isArray(params) ? params.map(p => ({id: p.id, name: p.name, type: p.type, description: p.description})) : [];
};

// Collection type (assuming it has id, name, description)
// This might already be defined in problems/types if Collection is exported from there
interface CollectionItem {
  id: string;
  name: string;
  description: string | null; // Matching what `api.get('/admin/collections')` might return
  // Add other fields if necessary, e.g., problemCount, createdAt
}

// Define the type for the imperative methods that can be called on ProblemCollectionAdmin via a ref
export interface ProblemCollectionAdminRef {
  openAddCollectionDialog: () => void;
  handleJsonImport: (jsonString: string, defaults?: { defaultTopicId?: string; defaultCollectionIds?: string[] }) => Promise<void>;
}

// Use forwardRef to allow parent component (LearningPathAdmin) to call methods on this component
export const ProblemCollectionAdmin = forwardRef<ProblemCollectionAdminRef, {}>((props, ref) => {
  const { token } = useAuth();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>('__ALL_PROBLEMS_VIEW__');
  const [problemsInView, setProblemsInView] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]); 

  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isAddProblemDialogOpen, setIsAddProblemDialogOpen] = useState(false);
  const [isEditProblemDialogOpen, setIsEditProblemDialogOpen] = useState(false);
  
  // State for JSON Import Dialog
  const [isAddProblemJsonDialogOpen, setIsAddProblemJsonDialogOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonParseResult, setJsonParseResult] = useState<ValidationResult | null>(null);

  const [newProblemData, setNewProblemData] = useState<NewProblemFormState>({
    name: '',
    content: '',
    difficulty: 'EASY',
    problemType: 'INFO',
    collectionIds: [],
    params: [],
    return_type: '',
    topicId: null,
    required: false,
    reqOrder: undefined,
  });
  const [editProblemData, setEditProblemData] = useState<EditProblemFormState | null>(null);

  const [currentSupportedLanguages, setCurrentSupportedLanguages] = useState<Record<SupportedLanguage, LanguageData>>(
    JSON.parse(JSON.stringify(defaultSupportedLanguages))
  );
  const [currentDefaultLanguage, setCurrentDefaultLanguage] = useState<string>('python');

  const [isLoadingProblemDetails, setIsLoadingProblemDetails] = useState(false);

  // State for Add/Edit Collection Dialogs
  const [isAddCollectionDialogOpen, setIsAddCollectionDialogOpen] = useState(false);
  const [newCollectionData, setNewCollectionData] = useState({ name: '', description: '' });
  const [isEditCollectionDialogOpen, setIsEditCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);

  // Expose a function to open the Add Collection dialog via ref
  useImperativeHandle(ref, () => ({
    openAddCollectionDialog: () => {
      setNewCollectionData({ name: '', description: '' });
      setIsAddCollectionDialogOpen(true);
    },
    handleJsonImport: handleParseAndAddProblemFromJson
  }));

  const fetchCollections = useCallback(async () => {
    if (!token) return;
    setIsLoadingCollections(true);
    try {
      const data = await api.get('/admin/collections', token) as CollectionItem[];
      setCollections(data || []);
      setError(null);
            } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to fetch collections.');
      toast.error('Failed to fetch collections.');
    } finally {
      setIsLoadingCollections(false);
    }
  }, [token]);

  const fetchTopicsAndLevels = useCallback(async () => {
    if (!token) return;
    setIsLoadingTopics(true);
    try {
      const levelsData = await api.get('/learning/levels', token) as Level[];
      setLevels(levelsData || []);
    } catch (err) {
      console.error('Error fetching learning path data:', err);
      toast.error('Failed to fetch learning path data.');
    } finally {
      setIsLoadingTopics(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCollections();
    fetchTopicsAndLevels();
  }, [fetchCollections, fetchTopicsAndLevels]);

  useEffect(() => {
    if (!token) return;
    const fetchAllProblems = async () => {
      setIsLoadingProblems(true);
      try {
        const data = await api.get('/problems', token) as Problem[];
        setAllProblems(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching all problems:', err);
        toast.error('Failed to fetch problems data.');
      } finally {
        setIsLoadingProblems(false);
      }
    };
    fetchAllProblems();
  }, [token]);
    
  useEffect(() => {
    if (selectedCollectionId === '__ALL_PROBLEMS_VIEW__') {
      // Filter out STANDALONE_INFO problems from the 'All Problems' view
      const filteredAllProblems = allProblems.filter(problem => problem.problemType !== 'STANDALONE_INFO');
      setProblemsInView(filteredAllProblems);
    } else if (selectedCollectionId) {
      const filteredProblems = allProblems.filter(problem =>
        problem.collectionIds?.includes(selectedCollectionId) && problem.problemType !== 'STANDALONE_INFO'
      );
      setProblemsInView(filteredProblems);
      } else {
      // This case should ideally not be reached. Fallback to all non-STANDALONE_INFO problems.
      const filteredAllProblems = allProblems.filter(problem => problem.problemType !== 'STANDALONE_INFO');
      setProblemsInView(filteredAllProblems); 
    }
  }, [selectedCollectionId, allProblems]);

  const refreshProblems = async () => {
    if (!token) return;
    setIsLoadingProblems(true);
    try {
      const data = await api.get('/problems', token) as Problem[];
      setAllProblems(data || []);
      toast.success("Problems refreshed");
            } catch (err) {
      toast.error("Failed to refresh problems");
    } finally {
      setIsLoadingProblems(false);
    }
  };

  const handleProblemInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    formType: 'add' | 'edit'
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? (value === '' ? undefined : parseInt(value)) : value;

    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
        if (!prev) return null;
        // Check if the field is part of codeProblem or top-level
        if (['language', 'functionName', 'timeLimit', 'memoryLimit', 'codeTemplate'].includes(name) && prev.codeProblem) {
             return {
                ...prev,
                codeProblem: {
                    ...(prev.codeProblem),
                    [name]: val,
                } as FormCodeProblemState,
            };
        }
        // Check for params or return_type (top-level on form state)
        if (name === 'params' || name === 'return_type') {
            return { ...prev, [name]: val };
        }
        return { ...prev, [name]: val };
    };
    
    if (formType === 'add') {
      setNewProblemData(updater as any);
    } else if (editProblemData) {
      setEditProblemData(updater as any);
    }
  };
  
  const handleProblemSelectChange = (
    name: keyof NewProblemFormState | keyof FormCodeProblemState,
    value: any,
    formType: 'add' | 'edit'
  ) => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev) return null;
      if (name === 'problemType' && value === 'CODING' && !prev.codeProblem) {
        return {
          ...prev,
          problemType: value as ProblemType,
          codeProblem: { 
            language: currentDefaultLanguage,
            functionName: 'solution',
            timeLimit: 5000,
            memoryLimit: 256, // Initialize required field
            codeTemplate: '', // Initialize required field
            testCases: [{ input: '[]', expected: 'null', isHidden: false }],
          },
        };
      }
      if (name === 'problemType' && value === 'INFO' && prev.codeProblem) {
         const { codeProblem, ...rest } = prev;
        return { ...rest, problemType: value as ProblemType };
      }

      // If unsetting required, also unset reqOrder
      if (name === 'required' && value === false) {
        return { ...prev, [name]: value, reqOrder: undefined };
      }

      if (['language', 'timeLimit', 'memoryLimit', 'functionName', 'codeTemplate'].includes(name as string) && prev.problemType === 'CODING' && prev.codeProblem) {
        return {
          ...prev,
          codeProblem: { ...(prev.codeProblem), [name]: value } as FormCodeProblemState,
        };
      }
      return { ...prev, [name]: value };
    };

    if (formType === 'add') {
      setNewProblemData(updater as any);
    } else if (editProblemData) {
      setEditProblemData(updater as any);
    }
  };
  
  const handleTestCaseChange = (index: number, field: keyof FormTestCase, value: string | boolean, formType: 'add' | 'edit') => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev || prev.problemType !== 'CODING' || !prev.codeProblem || !prev.codeProblem.testCases) return prev;
      const testCases = [...prev.codeProblem.testCases];
      if (testCases[index]) {
        (testCases[index] as any)[field] = value;
      }
      return { ...prev, codeProblem: { ...prev.codeProblem, testCases } };
    };
    if (formType === 'add') setNewProblemData(updater as any);
    else if (editProblemData) setEditProblemData(updater as any);
  };

  const handleAddTestCase = (formType: 'add' | 'edit') => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev || prev.problemType !== 'CODING' || !prev.codeProblem) return prev;
      const testCases = [...(prev.codeProblem.testCases || []), { input: '[]', expected: 'null', isHidden: false }];
      return { ...prev, codeProblem: { ...prev.codeProblem, testCases } };
    };
    if (formType === 'add') setNewProblemData(updater as any);
    else if (editProblemData) setEditProblemData(updater as any);
  };

  const handleRemoveTestCase = (index: number, formType: 'add' | 'edit') => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev || prev.problemType !== 'CODING' || !prev.codeProblem || !prev.codeProblem.testCases || prev.codeProblem.testCases.length <= 1) return prev;
      const testCases = prev.codeProblem.testCases.filter((_, i) => i !== index);
      return { ...prev, codeProblem: { ...prev.codeProblem, testCases } };
    };
    if (formType === 'add') setNewProblemData(updater as any);
    else if (editProblemData) setEditProblemData(updater as any);
  };

 const handleParamChange = (index: number, field: keyof FunctionParameter, value: string, formType: 'add' | 'edit') => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev || prev.problemType !== 'CODING') return prev;
      const params = [...(prev.params || [])]; // Params are top-level on form state
      if (!params[index]) params[index] = { name: '', type: '' };
      (params[index] as any)[field] = value;
      return { ...prev, params };
    };
    if (formType === 'add') setNewProblemData(updater as any);
    else if (editProblemData) setEditProblemData(updater as any);
  };

  const handleAddParam = (formType: 'add' | 'edit') => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev || prev.problemType !== 'CODING') return prev;
      const params = [...(prev.params || []), { name: '', type: '' }];
      return { ...prev, params };
    };
    if (formType === 'add') setNewProblemData(updater as any);
    else if (editProblemData) setEditProblemData(updater as any);
  };

  const handleRemoveParam = (index: number, formType: 'add' | 'edit') => {
    const updater = (prev: NewProblemFormState | EditProblemFormState | null) => {
      if (!prev || prev.problemType !== 'CODING' || !prev.params || prev.params.length === 0) return prev;
      const params = prev.params.filter((_, i) => i !== index);
      return { ...prev, params };
    };
    if (formType === 'add') setNewProblemData(updater as any);
    else if (editProblemData) setEditProblemData(updater as any);
  };

  const handleAddProblemToCollection = async () => {
      if (!token) return;
      
    let problemApiCollectionIds: string[] = newProblemData.collectionIds || [];

    // If a specific collection was targeted when opening the dialog (and it's not 'All Problems'),
    // ensure that collectionId is included.
    if (selectedCollectionId && selectedCollectionId !== '__ALL_PROBLEMS_VIEW__') {
      if (!problemApiCollectionIds.includes(selectedCollectionId)) {
        problemApiCollectionIds = [...problemApiCollectionIds, selectedCollectionId];
      }
    }

    let apiPayload: any = {
      name: newProblemData.name,
      content: newProblemData.content,
      difficulty: newProblemData.difficulty,
      problemType: newProblemData.problemType,
      slug: newProblemData.slug,
      estimatedTime: newProblemData.estimatedTime,
      collectionIds: problemApiCollectionIds, // Use the processed collection IDs
      topicId: newProblemData.topicId,
      required: newProblemData.required,
      reqOrder: newProblemData.required ? newProblemData.reqOrder : null,
      return_type: newProblemData.return_type,
      params: JSON.stringify(newProblemData.params || []),
      defaultLanguage: currentDefaultLanguage,
      languageSupport: JSON.stringify(currentSupportedLanguages),
    };

    if (newProblemData.problemType === 'CODING' && newProblemData.codeProblem) {
      const { testCases, ...restOfCodeProblem } = newProblemData.codeProblem;
      apiPayload.codeProblem = {
        ...restOfCodeProblem,
        testCases: (testCases || []).map(prepareFormTestCaseForAdminCodeProblemType),
      };
      apiPayload.testCases = JSON.stringify(
        (newProblemData.codeProblem.testCases || []).map(prepareFormTestCaseForApiSubmission)
      );
      // Ensure functionName etc. are included if they are part of codeProblem in newProblemData
      apiPayload.functionName = newProblemData.codeProblem.functionName;
      apiPayload.timeLimit = newProblemData.codeProblem.timeLimit;
      apiPayload.memoryLimit = newProblemData.codeProblem.memoryLimit;
    }

    try {
      await api.post('/problems', apiPayload, token);
      toast.success('Problem added successfully.');
      setIsAddProblemDialogOpen(false);
      setNewProblemData({ 
        name: '', content: '', difficulty: 'EASY', problemType: 'INFO', 
        params: [], return_type: '', collectionIds: [],
        topicId: null, required: false, reqOrder: undefined 
      });
      setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
      setCurrentDefaultLanguage('python');
      refreshProblems();
            } catch (err) {
      console.error('Error adding problem:', err);
      toast.error('Failed to add problem. ' + ((err as Error).message || ''));
    }
  };

  const openEditProblemDialog = (problem: Problem) => {
    if (!problem || !problem.id) {
        toast.error("Problem ID is missing, cannot fetch details.");
              return;
            }
    setIsLoadingProblemDetails(true);
    setEditProblemData(null); 
    setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
    setCurrentDefaultLanguage('python');

    api.get(`/problems/${problem.id}`, token)
      .then(problemDetailsFull => {
        if (!problemDetailsFull) {
            toast.error("Failed to fetch problem details.");
            setIsLoadingProblemDetails(false);
              return;
            }
        const problemDetails = problemDetailsFull as Problem;

        let formCodeProblem: FormCodeProblemState | undefined = undefined;
        let problemParams: FunctionParameter[] = [];
        let problemReturnType: string | undefined = undefined;
        
        if (problemDetails.problemType === 'CODING' && problemDetails.codeProblem) {
            const codeProblemDetails = problemDetails.codeProblem as any;
            try {
                const languageSupportData = codeProblemDetails.languageSupport;
                const defaultLangFromApi = codeProblemDetails.defaultLanguage;

                if (languageSupportData && typeof languageSupportData === 'object' && Object.keys(languageSupportData).length > 0) {
                    const normalizedState = JSON.parse(JSON.stringify(defaultSupportedLanguages));
                    for (const lang in languageSupportData) {
                        if (lang in normalizedState) {
                           normalizedState[lang as SupportedLanguage] = {
                               ...normalizedState[lang as SupportedLanguage], // keep default structure
                               ...languageSupportData[lang], // override with fetched data
                               enabled: true // always mark as enabled if it came from DB
                           };
                        }
                    }
                    setCurrentSupportedLanguages(normalizedState);
                    setCurrentDefaultLanguage(defaultLangFromApi || 'python');
                } else if (codeProblemDetails.codeTemplate) { // Legacy support
                    const initialLangState = JSON.parse(JSON.stringify(defaultSupportedLanguages));
                    const legacyLang = (defaultLangFromApi || codeProblemDetails.language || 'python') as SupportedLanguage;
                    if (legacyLang in initialLangState) {
                        initialLangState[legacyLang] = { ...initialLangState[legacyLang], enabled: true, template: codeProblemDetails.codeTemplate, reference: '', solution: '' };
                    }
                    setCurrentSupportedLanguages(initialLangState);
                    setCurrentDefaultLanguage(legacyLang);
                }
            } catch (err) {
                console.error("Error processing language support for edit:", err);
                toast.error("Error setting up language support from fetched data.");
                setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
                setCurrentDefaultLanguage('python');
            }

            const normalizedTestCases = (codeProblemDetails.testCases || []).map(normalizeAdminTestCaseToFormTestCase);

            formCodeProblem = {
                language: codeProblemDetails.language || currentDefaultLanguage,
                functionName: codeProblemDetails.functionName || '',
                timeLimit: codeProblemDetails.timeLimit || 5000,
                memoryLimit: codeProblemDetails.memoryLimit,
                codeTemplate: codeProblemDetails.codeTemplate || '',
                testCases: normalizedTestCases,
            };

            // Get params and return_type from codeProblem
            problemParams = parseParams(codeProblemDetails.params);
            problemReturnType = codeProblemDetails.return_type;
        }

        const finalEditData: EditProblemFormState = {
            id: problemDetails.id,
            name: problemDetails.name || '',
            content: problemDetails.content || '',
            difficulty: problemDetails.difficulty as ProblemDifficulty || 'EASY',
            problemType: problemDetails.problemType as ProblemType || 'INFO',
            slug: problemDetails.slug || '',
            estimatedTime: problemDetails.estimatedTime,
            collectionIds: problemDetails.collectionIds || [],
            topicId: problemDetails.topicId || null,
            required: problemDetails.required || false,
            reqOrder: problemDetails.reqOrder ?? undefined,
            codeProblem: formCodeProblem, 
            params: problemParams,
            return_type: problemReturnType,
        };
        setEditProblemData(finalEditData);
        setIsEditProblemDialogOpen(true);
      })
      .catch(err => {
        console.error("Error fetching problem details for edit:", err);
        toast.error("Failed to fetch problem details. " + ((err as Error).message || ''));
      })
      .finally(() => {
        setIsLoadingProblemDetails(false);
      });
  };

  const handleUpdateProblem = async () => {
    if (!token || !editProblemData) {
      toast.error('No problem data to update.');
        return;
      }
      
    let apiPayload: any = {
      name: editProblemData.name,
      content: editProblemData.content,
      difficulty: editProblemData.difficulty,
      problemType: editProblemData.problemType,
      slug: editProblemData.slug,
      estimatedTime: editProblemData.estimatedTime,
      collectionIds: editProblemData.collectionIds,
      topicId: editProblemData.topicId,
      required: editProblemData.required,
      reqOrder: editProblemData.required ? editProblemData.reqOrder : null,
      return_type: editProblemData.return_type,
      params: editProblemData.params,
    };

    if (editProblemData.problemType === 'CODING' && editProblemData.codeProblem) {
      // Re-structure the payload to match what the backend expects
      apiPayload.codeProblem = {
        functionName: editProblemData.codeProblem.functionName,
        timeLimit: editProblemData.codeProblem.timeLimit,
        memoryLimit: editProblemData.codeProblem.memoryLimit,
        return_type: editProblemData.return_type, // from top level form state
        params: editProblemData.params, // from top level form state
        defaultLanguage: currentDefaultLanguage,
        languageSupport: currentSupportedLanguages,
        testCases: (editProblemData.codeProblem.testCases || []).map(prepareFormTestCaseForApiSubmission),
      };
      // These are now inside codeProblem object, so remove from top-level if they exist
      delete apiPayload.return_type;
      delete apiPayload.params;
    }
    
    try {
      await api.put(`/problems/${editProblemData.id}`, apiPayload, token);
      toast.success('Problem updated successfully.');
      setIsEditProblemDialogOpen(false);
      setEditProblemData(null);
      refreshProblems();
    } catch (err) {
      console.error('Error updating problem:', err);
      toast.error('Failed to update problem.');
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
      if (!token) return;
    if (!confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/learning/problems/${problemId}`, token); // Ensure this endpoint is correct
      toast.success('Problem deleted successfully.');
      refreshProblems();
    } catch (err) {
      console.error('Error deleting problem:', err);
      toast.error('Failed to delete problem.');
    }
  };
  
  const renderProblemFormFields = (formType: 'add' | 'edit') => {
    const data = formType === 'add' ? newProblemData : editProblemData;
    if (!data && formType === 'edit') return null;
    
    const currentData = data as NewProblemFormState | EditProblemFormState;

  return (
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid gap-2">
          <Label htmlFor={`${formType}-name`}>Name <span className="text-destructive">*</span></Label>
          <Input id={`${formType}-name`} name="name" value={currentData.name} onChange={(e) => handleProblemInputChange(e, formType)} />
      </div>
            <div className="grid gap-2">
          <Label htmlFor={`${formType}-slug`}>Slug (URL-friendly)</Label>
          <Input id={`${formType}-slug`} name="slug" value={currentData.slug || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
            </div>
            <div className="grid gap-2">
          <Label htmlFor={`${formType}-content`}>Content (Markdown) <span className="text-destructive">*</span></Label>
          <Textarea id={`${formType}-content`} name="content" value={currentData.content} onChange={(e) => handleProblemInputChange(e, formType)} className="min-h-[100px]" />
            </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
            <Label htmlFor={`${formType}-difficulty`}>Difficulty <span className="text-destructive">*</span></Label>
            <Select value={currentData.difficulty} onValueChange={(val) => handleProblemSelectChange('difficulty', val as ProblemDifficulty, formType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
                {difficultyLevels.map(level => (
                  <SelectItem key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
            </div>
            <div className="grid gap-2">
            <Label htmlFor={`${formType}-problemType`}>Problem Type <span className="text-destructive">*</span></Label>
              <Select 
              value={currentData.problemType} 
              onValueChange={(val) => handleProblemSelectChange('problemType', val as ProblemType, formType)}
              disabled={formType === 'edit'}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="CODING">Coding</SelectItem>
                </SelectContent>
              </Select>
              </div>
      </div>
      
        {currentData.problemType === 'CODING' && (
              <>
            <h4 className="font-semibold mt-2 pt-2 border-t">Coding Details</h4>
                <div className="grid gap-2">
              <Label>Language Support <span className="text-destructive">*</span></Label>
              <LanguageSupport
                supportedLanguages={currentSupportedLanguages}
                setSupportedLanguages={setCurrentSupportedLanguages}
                defaultLanguage={currentDefaultLanguage}
                setDefaultLanguage={setCurrentDefaultLanguage}
              />
                </div>
                <div className="grid gap-2">
              <Label htmlFor={`${formType}-functionName`}>Function Name</Label>
              <Input id={`${formType}-functionName`} name="functionName" value={currentData.codeProblem?.functionName || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
      </div>
      
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`${formType}-return_type`}>Return Type (e.g., string, int[])</Label>
                  <Input id={`${formType}-return_type`} name="return_type" value={currentData.return_type || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
          </div>
          </div>
                
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`${formType}-timeLimit`}>Time Limit (ms)</Label>
                  <Input id={`${formType}-timeLimit`} name="timeLimit" type="number" value={currentData.codeProblem?.timeLimit || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
                  </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${formType}-memoryLimit`}>Memory Limit (MB)</Label>
                  <Input id={`${formType}-memoryLimit`} name="memoryLimit" type="number" value={currentData.codeProblem?.memoryLimit || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
                    </div>
                  </div>
                
                <div className="grid gap-2">
              <Label>Function Parameters</Label>
              <div className="space-y-4 border rounded p-3">
                {currentData.params?.map((param, index) => (
                  <div key={param.id || index} className="border-b last:border-b-0 pb-3 mb-3 space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Parameter {index + 1}</Label>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveParam(index, formType)}><Trash className="h-4 w-4" /></Button>
                </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="grid gap-1">
                            <Label htmlFor={`${formType}-param-name-${index}`} className="text-xs">Name <span className="text-destructive">*</span></Label>
                            <Input id={`${formType}-param-name-${index}`} placeholder="e.g., nums" value={param.name} onChange={(e) => handleParamChange(index, 'name', e.target.value, formType)} />
                          </div>
                        <div className="grid gap-1">
                            <Label htmlFor={`${formType}-param-type-${index}`} className="text-xs">Type <span className="text-destructive">*</span></Label>
                            <Input id={`${formType}-param-type-${index}`} placeholder="e.g., int[]" value={param.type} onChange={(e) => handleParamChange(index, 'type', e.target.value, formType)} />
                        </div>
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`${formType}-param-desc-${index}`} className="text-xs">Description (optional)</Label>
                        <Input id={`${formType}-param-desc-${index}`} placeholder="Parameter description" value={param.description || ''} onChange={(e) => handleParamChange(index, 'description', e.target.value, formType)} />
                </div>
              </div>
            ))}
                <Button variant="outline" size="sm" onClick={() => handleAddParam(formType)} className="w-full mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Parameter
                </Button>
          </div>
      </div>

            <div className="grid gap-2">
              <Label>Test Cases <span className="text-destructive">*</span></Label>
              <div className="space-y-3 border rounded p-3 max-h-[300px] overflow-y-auto">
                {currentData.codeProblem?.testCases?.map((tc, index) => (
                  <div key={tc.id || index} className="space-y-2 border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Test Case {index + 1}</Label>
                      { (currentData.codeProblem?.testCases?.length || 0) > 1 &&
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTestCase(index, formType)}><Trash className="h-4 w-4" /></Button>
                      }
            </div>
                    <Textarea placeholder='Input (e.g., [1,2,3] or {"key":"value"})' value={tc.input} onChange={(e) => handleTestCaseChange(index, 'input', e.target.value, formType)} className="font-mono text-xs" />
                    <Textarea placeholder='Expected Output (e.g., 6 or "hello")' value={tc.expected} onChange={(e) => handleTestCaseChange(index, 'expected', e.target.value, formType)} className="font-mono text-xs" />
                        <div className="flex items-center gap-2">
                      <Checkbox id={`${formType}-tc-hidden-${index}`} checked={tc.isHidden} onCheckedChange={(checked) => handleTestCaseChange(index, 'isHidden', !!checked, formType)} />
                      <Label htmlFor={`${formType}-tc-hidden-${index}`} className="text-xs">Hidden</Label>
            </div>
            </div>
                    ))}
                <Button variant="outline" size="sm" onClick={() => handleAddTestCase(formType)} className="w-full mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Test Case
                    </Button>
                  </div>
                </div>
              </>
            )}
        
            <div className="grid gap-2">
        <Label htmlFor={`${formType}-estimatedTime`}>Estimated Time (minutes)</Label>
        <Input id={`${formType}-estimatedTime`} name="estimatedTime" type="number" value={currentData.estimatedTime || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <h4 className="font-semibold text-base">Organizational Details</h4>
              <div className="grid gap-2">
                <Label htmlFor={`${formType}-topicId`}>Topic</Label>
                <Select
                  value={currentData.topicId || ''}
                  onValueChange={(val) => handleProblemSelectChange('topicId', val === 'none' ? null : val, formType)}
                  disabled={isLoadingTopics}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="none">None</SelectItem>
                    {levels.map(level => (
                      <React.Fragment key={level.id}>
                        <p className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{level.name}</p>
                        {(level.topics || []).map(topic => (
                            <SelectItem key={topic.id} value={topic.id} className="pl-6">
                              {topic.name}
                            </SelectItem>
                          ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={`${formType}-required`}
                  checked={!!currentData.required}
                  onCheckedChange={(checked) => handleProblemSelectChange('required', !!checked, formType)}
                />
                <Label htmlFor={`${formType}-required`} className="font-normal">
                  Required Problem (within a topic)
                </Label>
              </div>

              {currentData.required && (
                <div className="grid gap-2 pl-6">
                  <Label htmlFor={`${formType}-reqOrder`}>Required Order</Label>
                  <Input
                    id={`${formType}-reqOrder`}
                    name="reqOrder"
                    type="number"
                    value={currentData.reqOrder ?? ''}
                    onChange={(e) => handleProblemInputChange(e, formType)}
                    placeholder="e.g., 1"
                  />
                </div>
              )}
            </div>
            
        {formType === 'edit' && (
            <div className="grid gap-2 mt-4 pt-4 border-t">
            <Label htmlFor={`${formType}-collectionIds`}>Collections</Label>
            <div className="space-y-2 border rounded-md p-3 max-h-[150px] overflow-y-auto">
              {isLoadingCollections ? (
                <p className="text-sm text-muted-foreground">Loading collections...</p>
                ) : collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No collections available.</p>
                ) : (
                collections.map(collection => (
                      <div key={collection.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`${formType}-collection-${collection.id}`}
                      checked={(currentData as EditProblemFormState).collectionIds?.includes(collection.id) || false}
                      onCheckedChange={(checked) => {
                        const problemDataToUpdate = currentData as EditProblemFormState;
                        const currentCollectionIds = problemDataToUpdate.collectionIds || [];
                        let newCollectionIds: string[];
                        if (checked) {
                          newCollectionIds = [...currentCollectionIds, collection.id];
      } else {
                          newCollectionIds = currentCollectionIds.filter(id => id !== collection.id);
                        }
                        if (formType === 'edit') { 
                          setEditProblemData(prev => prev ? ({ ...prev, collectionIds: newCollectionIds }) : null);
                            }
                          }}
                        />
                    <Label htmlFor={`${formType}-collection-${collection.id}`} className="font-normal">
                      {collection.name}
                    </Label>
                      </div>
                    ))
                )}
              </div>
            </div>
        )} 
                </div>
    );
  };

  const handleParseAndAddProblemFromJson = useCallback(async (jsonString: string, defaults?: { defaultTopicId?: string; defaultCollectionIds?: string[] }) => {
    setJsonParseResult(null); 
    if (!jsonString.trim()) {
      toast.error("JSON input cannot be empty.");
      setJsonParseResult({ isValid: false, errors: [{ path: ["json"], message: "Input is empty."}], warnings: [] });
      return;
    }
    
    const result = validateAndParseProblemJSON(jsonString);
    setJsonParseResult(result);

    if (!result.isValid || !result.parsedData) {
      toast.error("JSON validation failed. Please check the errors below.");
      return;
    }

    const problemData = result.parsedData;
    let finalTopicId = problemData.topicId; // Prefer topicId from JSON if present
    if (!finalTopicId && defaults?.defaultTopicId) {
      finalTopicId = defaults.defaultTopicId;
    }

    let finalCollectionIds = problemData.collectionIds || [];
    if (defaults?.defaultCollectionIds) {
      finalCollectionIds = Array.from(new Set([...finalCollectionIds, ...defaults.defaultCollectionIds]));
    }

    let apiPayload: any = {
      name: problemData.name,
      content: problemData.content,
      difficulty: problemData.difficulty,
      problemType: problemData.problemType,
      required: problemData.required,
      reqOrder: problemData.reqOrder,
      slug: problemData.slug,
      estimatedTime: problemData.estimatedTime,
      collectionIds: finalCollectionIds.length > 0 ? finalCollectionIds : [], // Ensure it's at least an empty array
      topicId: finalTopicId, 
    };

    if (problemData.problemType === 'CODING' && problemData.coding) {
      apiPayload.defaultLanguage = problemData.coding.languages.defaultLanguage;
      const languageSupportPayload: Record<string, { template: string, reference?: string, solution?: string, enabled: boolean }> = {};
      Object.entries(problemData.coding.languages.supported).forEach(([lang, data]) => {
        if (data) {
          languageSupportPayload[lang] = { 
            template: data.template, 
            reference: data.reference || "", 
            solution: data.solution || "",
            enabled: true 
          };
        }
      });
      if (!languageSupportPayload[problemData.coding.languages.defaultLanguage] && 
          problemData.coding.languages.supported[problemData.coding.languages.defaultLanguage]?.template) {
          languageSupportPayload[problemData.coding.languages.defaultLanguage] = {
              template: problemData.coding.languages.supported[problemData.coding.languages.defaultLanguage]!.template,
              reference: problemData.coding.languages.supported[problemData.coding.languages.defaultLanguage]!.reference || "",
              solution: problemData.coding.languages.supported[problemData.coding.languages.defaultLanguage]!.solution || "",
              enabled: true,
          };
      }
      apiPayload.languageSupport = JSON.stringify(languageSupportPayload);
      apiPayload.functionName = problemData.coding.functionName;
      apiPayload.timeLimit = problemData.coding.timeLimit;
      apiPayload.memoryLimit = problemData.coding.memoryLimit;
      apiPayload.return_type = problemData.coding.returnType;
      apiPayload.params = JSON.stringify(problemData.coding.parameters || []);
      apiPayload.testCases = JSON.stringify(
        problemData.coding.testCases.map(tc => ({
          input: tc.input, 
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })) || []
      );
    } else if (problemData.problemType === 'CODING' && !problemData.coding) {
        toast.error("CODING problem type selected in JSON, but 'coding' object is missing or invalid.");
      return;
    }
    
    try {
      await api.post('/problems', apiPayload, token);
      toast.success('Problem added successfully via JSON!');
      refreshProblems(); 
    } catch (err) {
      console.error('Error adding problem from JSON:', err);
      toast.error('Failed to add problem from JSON. ' + ((err as Error).message || ''));
      throw err;
    }
  }, [token, refreshProblems]);

  const handleAddCollection = async () => {
    if (!token || !newCollectionData.name.trim()) {
      toast.error("Collection name cannot be empty.");
          return;
        }
    try {
      await api.post('/admin/collections', newCollectionData, token);
      toast.success("Collection created successfully!");
      setIsAddCollectionDialogOpen(false);
      fetchCollections(); // Refresh collection list
    } catch (err) {
      console.error("Error creating collection:", err);
      toast.error("Failed to create collection. " + ((err as Error).message || ''));
    }
  };
  
  const handleOpenEditCollectionDialog = (collection: CollectionItem) => {
    setEditingCollection(collection);
    setIsEditCollectionDialogOpen(true);
  };

  const handleUpdateCollection = async () => {
    if (!token || !editingCollection || !editingCollection.name.trim()) {
      toast.error("Collection name cannot be empty.");
      return;
    }
    try {
      await api.put(`/admin/collections/${editingCollection.id}`, { 
        name: editingCollection.name, 
        description: editingCollection.description 
      }, token);
      toast.success("Collection updated successfully!");
      setIsEditCollectionDialogOpen(false);
      setEditingCollection(null);
      fetchCollections();
    } catch (err) {
      console.error("Error updating collection:", err);
      toast.error("Failed to update collection. " + ((err as Error).message || ''));
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this collection? This action cannot be undone and might orphan problems.")) {
      return;
    }
    try {
      await api.delete(`/admin/collections/${collectionId}`, token);
      toast.success("Collection deleted successfully!");
      if (selectedCollectionId === collectionId) {
        setSelectedCollectionId('__ALL_PROBLEMS_VIEW__'); // Reset view if deleted collection was selected
      }
      fetchCollections();
    } catch (err) {
      console.error("Error deleting collection:", err);
      toast.error("Failed to delete collection. " + ((err as Error).message || ''));
    }
  };

  // Ensure LoadingCard is rendered when isLoadingProblemDetails is true
  if (isLoadingProblemDetails) {
    return <LoadingCard text="Loading problem details..." />;
  }

  return (
    <Card className="shadow-none border-none">
      <CardContent className="space-y-6 pt-0">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/4 lg:w-1/5 border-r pr-4 flex flex-col">
            <h4 className="text-lg font-semibold mb-3">Collections Filter</h4>
            <div className="h-[600px] overflow-y-auto space-y-1 pr-1 flex-grow">
                            <Button
                variant={selectedCollectionId === '__ALL_PROBLEMS_VIEW__' ? "secondary" : "ghost"}
                onClick={() => setSelectedCollectionId('__ALL_PROBLEMS_VIEW__')}
                className="w-full justify-start text-left text-sm py-2 h-auto mb-1"
                disabled={isLoadingCollections || isLoadingProblems}
              >
                View All Problems
                            </Button>
              {isLoadingCollections && <div className="p-2 text-sm text-muted-foreground">Loading...</div>}
            {collections.map((collection) => (
                <div key={collection.id} className="flex items-center group">
        <Button 
                        variant={selectedCollectionId === collection.id ? "secondary" : "ghost"}
                        onClick={() => setSelectedCollectionId(collection.id)}
                        className="w-full justify-start text-left truncate text-sm py-2 h-auto flex-grow"
                        title={collection.name}
                        >
                        {collection.name}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenEditCollectionDialog(collection)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive-foreground" onClick={() => handleDeleteCollection(collection.id)}>
                        <Trash2 className="h-4 w-4" />
        </Button>
      </div>
              ))}
      </div>
          </div>
                        
          <div className="w-full md:w-3/4 lg:w-4/5">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                  <div>
                <h5 className="text-xl font-semibold">
                  {selectedCollectionId === '__ALL_PROBLEMS_VIEW__' 
                    ? 'All Problems' 
                    : selectedCollectionId 
                      ? collections.find(c => c.id === selectedCollectionId)?.name || 'Selected Collection' 
                      : 'No Collection Selected'}
                  {selectedCollectionId !== '__ALL_PROBLEMS_VIEW__' && selectedCollectionId && " Problems"}
                </h5>
                </div>
                <div className="flex gap-2">
                  <Button 
                        variant="outline"
                    size="sm"
                        onClick={refreshProblems}
                        disabled={isLoadingProblems || isLoadingCollections}
                        className="flex items-center gap-2"
                    >
                      {(isLoadingProblems || isLoadingCollections) ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Refresh
                  </Button>

                {/* Conditional Buttons for Add Problem / Add JSON */}
                {selectedCollectionId === '__ALL_PROBLEMS_VIEW__' ? (
                  <>
                    {/* SWAPPED: "Add Problem" (form) button now comes BEFORE "Add JSON" */}
                    <Dialog open={isAddProblemDialogOpen} onOpenChange={setIsAddProblemDialogOpen}>
                      <DialogTrigger asChild>
                  <Button 
                          variant="outline" 
                    size="sm"
                          disabled={isLoadingCollections || isLoadingProblems}
                  >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Problem
                  </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Add New Problem</DialogTitle>
                          <DialogDescription>
                            Create a new problem. You can assign collections within the form.
                          </DialogDescription>
                        </DialogHeader>
                        {renderProblemFormFields('add')}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddProblemDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddProblemToCollection}>Add Problem</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  <Button 
                    variant="outline" 
                    size="sm"
                      onClick={() => {
                        setJsonInput(""); 
                        setJsonParseResult(null); 
                        setIsAddProblemJsonDialogOpen(true);
                      }}
                      disabled={isLoadingProblems}
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Add JSON
                  </Button>
                  </>
                ) : selectedCollectionId ? ( // A specific collection is selected
                  <>
                    {/* Order here is already: Add Problem (form), then Add JSON */}
                    <Dialog open={isAddProblemDialogOpen} onOpenChange={setIsAddProblemDialogOpen}>
                      <DialogTrigger asChild>
                  <Button 
                          variant="outline" 
                    size="sm"
                          disabled={isLoadingCollections || isLoadingProblems}
                  >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Problem
                  </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
          <DialogHeader>
                          <DialogTitle>Add New Problem to '{collections.find(c => c.id === selectedCollectionId)?.name || 'Selected Collection'}'</DialogTitle>
            <DialogDescription>
                            Create a new problem and add it to this collection.
            </DialogDescription>
          </DialogHeader>
                        {renderProblemFormFields('add')}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddProblemDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddProblemToCollection}>Add Problem</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                            <Button
                      variant="outline" 
                              size="sm"
                              onClick={() => {
                        setJsonInput(""); 
                        setJsonParseResult(null); 
                        setIsAddProblemJsonDialogOpen(true);
                      }}
                      disabled={isLoadingCollections || isLoadingProblems}
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Add JSON
                            </Button>
                  </>
                ) : null}
                          </div>
                        </div>
                        
            <p className="text-sm text-muted-foreground mb-4">
              Note: To manage a problem's association with topics or other collections, use the "Edit" button for that problem (here or in the Learning Path view).
            </p>

            {isLoadingProblems && <p className="text-center py-4">Loading problems...</p>}
            {!isLoadingProblems && error && <p className="text-destructive text-center py-4">{error}</p>}
            
            {!isLoadingProblems && !error && selectedCollectionId && selectedCollectionId !== '__ALL_PROBLEMS_VIEW__' && problemsInView.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No problems in this collection. Add one using the button above.
              </p>
            )}
            {!isLoadingProblems && !error && !selectedCollectionId && (
                <p className="text-center text-muted-foreground py-4">
                    Please select a collection from the list to view its problems, or choose 'View All Problems'.
                </p>
            )}
            {selectedCollectionId === '__ALL_PROBLEMS_VIEW__' && !isLoadingProblems && problemsInView.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                    No problems found in the system. Use "Add JSON" to add some.
                </p>
            )}

            {!isLoadingProblems && problemsInView.length > 0 && (
              <div className="h-[600px] overflow-y-auto space-y-3 pr-2">
                {problemsInView.map((problem) => (
                  <Card key={problem.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{problem.name}</h4>
                        <p className="text-xs text-muted-foreground">ID: {problem.id} | Slug: {problem.slug || 'N/A'}</p>
                        <div className="mt-1">
                          <Badge variant="outline" className="mr-2">{problem.difficulty}</Badge>
                          <Badge variant="secondary">{problem.problemType}</Badge>
            </div>
            </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditProblemDialog(problem)}>
                          <Edit className="mr-1 h-4 w-4" /> Edit
                            </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteProblem(problem.id)}>
                          <Trash className="mr-1 h-4 w-4" /> Delete
                    </Button>
              </div>
            </div>
                  </Card>
                ))}
          </div>
            )}
            
            <Dialog open={isEditProblemDialogOpen} onOpenChange={setIsEditProblemDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Problem: {editProblemData?.name || 'Loading...'}</DialogTitle>
                        <DialogDescription>Modify the problem details.</DialogDescription>
                    </DialogHeader>
                    {editProblemData ? renderProblemFormFields('edit') : <LoadingSpinner />}
          <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProblemDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateProblem} disabled={!editProblemData}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            </div>
            </div>

      </CardContent>

      {/* JSON Import Dialog */}
      <Dialog open={isAddProblemJsonDialogOpen} onOpenChange={(isOpen) => {
        setIsAddProblemJsonDialogOpen(isOpen);
        if (!isOpen) {
          setJsonInput("");
          setJsonParseResult(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Problem via JSON</DialogTitle>
            <DialogDescription>
              {selectedCollectionId && selectedCollectionId !== '__ALL_PROBLEMS_VIEW__' 
                ? `Importing to collection: ${collections.find(c => c.id === selectedCollectionId)?.name || 'Selected Collection'}. JSON content can override this.`
                : "Importing to general problem list. You can specify collection IDs or a topic ID within the JSON."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-4">
              <Textarea
              placeholder='Paste JSON here...'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            {jsonParseResult && !jsonParseResult.isValid && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs">
                <h4 className="font-semibold mb-1">Validation Errors:</h4>
                <ul className="list-disc list-inside">
                  {jsonParseResult.errors.map((err, idx) => (
                    <li key={idx}>{err.path.join('.')} - {err.message}</li>
                  ))}
                </ul>
            </div>
            )}
            {jsonParseResult && jsonParseResult.warnings && jsonParseResult.warnings.length > 0 && (
               <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-700 text-xs">
                <h4 className="font-semibold mb-1">Warnings:</h4>
                <ul className="list-disc list-inside">
                  {jsonParseResult.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
            </div>
            )}
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddProblemJsonDialogOpen(false);
              setJsonInput("");
              setJsonParseResult(null);
            }}>Cancel</Button>
            <Button onClick={async () => {
              try {
                const defaults = selectedCollectionId && selectedCollectionId !== '__ALL_PROBLEMS_VIEW__' 
                  ? { defaultCollectionIds: [selectedCollectionId] } 
                  : undefined;
                await handleParseAndAddProblemFromJson(jsonInput, defaults);
                // On success, close dialog and reset state
                setIsAddProblemJsonDialogOpen(false);
                setJsonInput("");
                setJsonParseResult(null);
              } catch (e) {
                // Error is already toasted by handleParseAndAddProblemFromJson
                // No need to close dialog on error, user might want to correct JSON
              }
            }}>Parse & Add Problem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Collection Dialog */}
      <Dialog open={isAddCollectionDialogOpen} onOpenChange={setIsAddCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Collection</DialogTitle>
            <DialogDescription>Create a new collection to organize problems.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
                <div className="grid gap-2">
              <Label htmlFor="new-collection-name">Name</Label>
              <Input
                id="new-collection-name" 
                value={newCollectionData.name} 
                onChange={(e) => setNewCollectionData({...newCollectionData, name: e.target.value})} 
                placeholder="e.g., Dynamic Programming Basics"
                  />
                </div>
                <div className="grid gap-2">
              <Label htmlFor="new-collection-description">Description (Optional)</Label>
                            <Textarea
                id="new-collection-description" 
                value={newCollectionData.description} 
                onChange={(e) => setNewCollectionData({...newCollectionData, description: e.target.value})} 
                placeholder="A brief description of this collection."
                            />
                          </div>
                          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCollectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCollection}>Create Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      {editingCollection && (
        <Dialog open={isEditCollectionDialogOpen} onOpenChange={(isOpen) => {
            setIsEditCollectionDialogOpen(isOpen);
            if (!isOpen) setEditingCollection(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Collection: {editingCollection.name}</DialogTitle>
              <DialogDescription>Update the collection details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-collection-name">Name</Label>
              <Input
                  id="edit-collection-name" 
                  value={editingCollection.name} 
                  onChange={(e) => setEditingCollection({...editingCollection, name: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-collection-description">Description (Optional)</Label>
                <Textarea 
                  id="edit-collection-description" 
                  value={editingCollection.description || ''} 
                  onChange={(e) => setEditingCollection({...editingCollection, description: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
              <Button variant="outline" onClick={() => {setIsEditCollectionDialogOpen(false); setEditingCollection(null);}}>Cancel</Button>
              <Button onClick={handleUpdateCollection}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

    </Card>
  );
});
