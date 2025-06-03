import React, { useState, useEffect, useCallback } from 'react';
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
import { PlusCircle, Trash, Edit, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Local type for managing test cases in the form
interface FormTestCase {
  id?: string; 
  input: string; // Stringified JSON
  expected: string; // Stringified JSON
  isHidden: boolean;
}

// Type for what the API expects for a test case (part of overall problem payload, not directly AdminCodeProblemType)
interface ApiSubmittedTestCase {
  input: string; 
  expectedOutput: string; 
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
  codeProblem?: FormCodeProblemState; // Uses the new FormCodeProblemState
  // Fields not in AdminCodeProblemType but part of general problem create/update
  return_type?: string;
  params?: FunctionParameter[];
  estimatedTime?: number;
  slug?: string;
};

type EditProblemFormState = NewProblemFormState & {
  id: string;
  collectionIds: string[];
};

const difficultyLevels: ProblemDifficulty[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD'];

// Converts API AdminTestCase (any[] input, any expected) to FormTestCase (stringified)
const normalizeAdminTestCaseToFormTestCase = (adminTC: AdminTestCase): FormTestCase => {
  return {
    // id: adminTC.id, // if AdminTestCase had an ID
    input: JSON.stringify(adminTC.input),
    expected: JSON.stringify(adminTC.expected),
    isHidden: (adminTC as any).isHidden || false, // If isHidden comes from backend (not in type)
  };
};

// Converts FormTestCase (stringified) to AdminTestCase (any[] input, any expected)
// This is used when constructing the AdminCodeProblemType object for the problem state
const prepareFormTestCaseForAdminCodeProblemType = (formTC: FormTestCase): AdminTestCase => {
  try {
    return {
      input: JSON.parse(formTC.input),
      expected: JSON.parse(formTC.expected),
      // isHidden is not part of AdminTestCase, so it's omitted here
    };
  } catch (e) {
    console.error("Error parsing FormTestCase input/expected:", e);
    // Return a default/empty AdminTestCase or handle error appropriately
    return { input: [], expected: null }; 
  }
};

// Converts FormTestCase to what the API submission expects for a test case (stringified + isHidden)
const prepareFormTestCaseForApiSubmission = (formTC: FormTestCase): ApiSubmittedTestCase => {
  return {
    input: formTC.input, // Already stringified
    expectedOutput: formTC.expected, // Already stringified
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

export function ProblemCollectionAdmin() {
  const { token } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [problemsInView, setProblemsInView] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]); 

  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddProblemDialogOpen, setIsAddProblemDialogOpen] = useState(false);
  const [isEditProblemDialogOpen, setIsEditProblemDialogOpen] = useState(false);
  
  const [newProblemData, setNewProblemData] = useState<NewProblemFormState>({
    name: '',
    content: '',
    difficulty: 'EASY',
    problemType: 'INFO',
  });
  const [editProblemData, setEditProblemData] = useState<EditProblemFormState | null>(null);

  const [currentSupportedLanguages, setCurrentSupportedLanguages] = useState<Record<SupportedLanguage, LanguageData>>(
    JSON.parse(JSON.stringify(defaultSupportedLanguages))
  );
  const [currentDefaultLanguage, setCurrentDefaultLanguage] = useState<string>('python');

  useEffect(() => {
    if (!token) return;
    const fetchCollections = async () => {
      setIsLoadingCollections(true);
      try {
        const data = await api.get('/admin/collections', token) as Collection[];
        setCollections(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError('Failed to fetch collections.');
        toast.error('Failed to fetch collections.');
      } finally {
        setIsLoadingCollections(false);
      }
    };
    fetchCollections();
  }, [token]);

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
      setProblemsInView(allProblems);
    } else if (selectedCollectionId) {
      const filteredProblems = allProblems.filter(problem =>
        problem.collectionIds?.includes(selectedCollectionId)
      );
      setProblemsInView(filteredProblems);
    } else {
      setProblemsInView([]);
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
    if (!token || !selectedCollectionId) {
      toast.error('A collection must be selected to add a problem.');
        return;
      }
      
    let apiPayload: any = {
      name: newProblemData.name,
      content: newProblemData.content,
      difficulty: newProblemData.difficulty,
      problemType: newProblemData.problemType,
      slug: newProblemData.slug,
      estimatedTime: newProblemData.estimatedTime,
      collectionIds: [selectedCollectionId],
      // Add fields not in AdminCodeProblemType
      return_type: newProblemData.return_type,
      params: JSON.stringify(newProblemData.params || []),
      defaultLanguage: currentDefaultLanguage, // Add defaultLanguage to payload
      languageSupport: JSON.stringify( // Add languageSupport to payload
        prepareLanguageSupport(currentDefaultLanguage, currentSupportedLanguages)
      ),
    };

    if (newProblemData.problemType === 'CODING' && newProblemData.codeProblem) {
      const { testCases, ...restOfCodeProblem } = newProblemData.codeProblem;
      apiPayload.codeProblem = {
        ...restOfCodeProblem,
        testCases: (testCases || []).map(prepareFormTestCaseForAdminCodeProblemType),
      };
      // For API submission, testCases are often a separate top-level field, stringified.
      // The backend PRISMA schema has Problem.testCases as Json?
      // And CodeProblem.testCases as relation to TestCase[]
      // Let's assume backend's /problems endpoint expects stringified testCases at top level for simplicity of creation.
      // If it expects it inside codeProblem, then the previous line is fine.
      // If backend handles test case creation via relation inside codeProblem creation, that's more complex.
      // For now, sending prepared (stringified + isHidden) FormTestCases at top-level.
      apiPayload.testCases = JSON.stringify(
        (newProblemData.codeProblem.testCases || []).map(prepareFormTestCaseForApiSubmission)
      );
    }


    try {
      await api.post('/problems', apiPayload, token);
      toast.success('Problem added successfully to collection.');
      setIsAddProblemDialogOpen(false);
      setNewProblemData({ name: '', content: '', difficulty: 'EASY', problemType: 'INFO', params: [], return_type: '' });
      setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
      setCurrentDefaultLanguage('python');
      refreshProblems();
    } catch (err) {
      console.error('Error adding problem:', err);
      toast.error('Failed to add problem.');
    }
  };

  const openEditProblemDialog = (problem: Problem) => {
    if (!problem) return;
    
    const problemDetails = problem; 
    let formCodeProblem: FormCodeProblemState | undefined = undefined;

    if (problemDetails.problemType === 'CODING' && problemDetails.codeProblem) {
      const { testCases, ...restAdminCodeProblem } = problemDetails.codeProblem;
      formCodeProblem = {
        ...restAdminCodeProblem,
        testCases: problemDetails.codeProblem.testCases?.map(normalizeAdminTestCaseToFormTestCase) || [],
      };
      
      // Language support handling (assuming languageSupport and defaultLanguage are on main Problem object from API)
      const langSupportFromApi = (problemDetails as any).languageSupport;
      const defaultLangFromApi = (problemDetails as any).defaultLanguage;

      if (langSupportFromApi && typeof langSupportFromApi === 'object') {
        try {
            const initialLangState = JSON.parse(JSON.stringify(defaultSupportedLanguages));
            Object.entries(langSupportFromApi).forEach(([lang, data]: [string, any]) => {
                if (lang in initialLangState) {
                    initialLangState[lang as SupportedLanguage] = {
                        enabled: true, // If present, it was enabled
                        template: data.template || '',
                        reference: data.reference || ''
                    };
                }
            });
            setCurrentSupportedLanguages(initialLangState);
            setCurrentDefaultLanguage(defaultLangFromApi || 'python');
        } catch (e) {
             console.error("Error processing language support for edit:", e);
            setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
            setCurrentDefaultLanguage('python');
        }
      } else if (problemDetails.codeProblem.codeTemplate) { // Fallback for older problems
          const initialLangState = JSON.parse(JSON.stringify(defaultSupportedLanguages));
          const legacyLang = (defaultLangFromApi || problemDetails.codeProblem.language || 'python') as SupportedLanguage;
          if (legacyLang in initialLangState) {
              initialLangState[legacyLang] = { ...initialLangState[legacyLang], enabled: true, template: problemDetails.codeProblem.codeTemplate };
          }
          setCurrentSupportedLanguages(initialLangState);
          setCurrentDefaultLanguage(legacyLang);
      } else {
        setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
        setCurrentDefaultLanguage('python');
      }
      } else {
        setCurrentSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
        setCurrentDefaultLanguage('python');
    }

    setEditProblemData({
      id: problemDetails.id,
      name: problemDetails.name || '',
      content: problemDetails.content || '',
      difficulty: problemDetails.difficulty as ProblemDifficulty || 'EASY',
      problemType: problemDetails.problemType as ProblemType || 'INFO',
      slug: problemDetails.slug,
      estimatedTime: problemDetails.estimatedTime,
      collectionIds: problemDetails.collectionIds || [],
      codeProblem: formCodeProblem,
      // Populate params and return_type from the main problem object if they exist
      params: parseParams((problemDetails as any).params),
      return_type: (problemDetails as any).return_type,
    });
    setIsEditProblemDialogOpen(true);
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
      return_type: editProblemData.return_type,
      params: JSON.stringify(editProblemData.params || []),
      defaultLanguage: currentDefaultLanguage,
      languageSupport: JSON.stringify(
        prepareLanguageSupport(currentDefaultLanguage, currentSupportedLanguages)
      ),
    };

    if (editProblemData.problemType === 'CODING' && editProblemData.codeProblem) {
      const { testCases, ...restOfCodeProblem } = editProblemData.codeProblem; // testCases here are FormTestCase[]
      apiPayload.codeProblem = {
        ...restOfCodeProblem,
        // Convert FormTestCase[] back to AdminTestCase[] for the codeProblem object if API expects that structure
        testCases: (testCases || []).map(prepareFormTestCaseForAdminCodeProblemType), 
      };
      // And also prepare stringified FormTestCases for top-level API submission
       apiPayload.testCases = JSON.stringify(
        (editProblemData.codeProblem.testCases || []).map(prepareFormTestCaseForApiSubmission)
      );
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
              <Label htmlFor={`${formType}-codeTemplate`}>Base Code Template</Label>
              <Textarea id={`${formType}-codeTemplate`} name="codeTemplate" value={currentData.codeProblem?.codeTemplate || ''} onChange={(e) => handleProblemInputChange(e, formType)} className="font-mono text-sm min-h-[80px]" />
              <p className="text-xs text-muted-foreground">
                This template is part of the language support settings above. Changing it here updates the current default language template.
              </p>
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
              <div className="space-y-2 border rounded p-3">
                {currentData.params?.map((param, index) => (
                  <div key={param.id || index} className="grid grid-cols-3 gap-2 items-end">
                    <Input placeholder="Name (e.g., nums)" value={param.name} onChange={(e) => handleParamChange(index, 'name', e.target.value, formType)} />
                    <Input placeholder="Type (e.g., int[])" value={param.type} onChange={(e) => handleParamChange(index, 'type', e.target.value, formType)} />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveParam(index, formType)}><Trash className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => handleAddParam(formType)}>Add Parameter</Button>
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
                <Button variant="outline" size="sm" onClick={() => handleAddTestCase(formType)}>Add Test Case</Button>
              </div>
            </div>
          </> 
        )}
            
        <div className="grid gap-2">
        <Label htmlFor={`${formType}-estimatedTime`}>Estimated Time (minutes)</Label>
        <Input id={`${formType}-estimatedTime`} name="estimatedTime" type="number" value={currentData.estimatedTime || ''} onChange={(e) => handleProblemInputChange(e, formType)} />
        </div>

        {/* Collections Selector - Conditional Render for Edit Mode */}
        {formType === 'edit' && (
          <div className="grid gap-2">
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
        )} {/* End Collections Selector Conditional Render */}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Problem Collection Management</CardTitle>
        <CardDescription>Organize problems by collection/category.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/4 lg:w-1/5 border-r pr-4">
            <h4 className="text-lg font-semibold mb-3">Collections</h4>
            <div className="space-y-2 flex flex-col items-stretch">
              <Button 
                variant={!selectedCollectionId ? "secondary" : "ghost"}
                onClick={() => setSelectedCollectionId(null)}
                className="w-full justify-start text-left"
                disabled={isLoadingCollections}
              >
                Clear Filter / Show None
              </Button>
              <Button 
                variant={selectedCollectionId === '__ALL_PROBLEMS_VIEW__' ? "secondary" : "ghost"}
                onClick={() => setSelectedCollectionId('__ALL_PROBLEMS_VIEW__')}
                className="w-full justify-start text-left mt-1 mb-3 pt-2 pb-2 border-t border-b"
                disabled={isLoadingCollections || isLoadingProblems}
              >
                View All Problems
              </Button>
              {isLoadingCollections && <p className="text-sm text-muted-foreground">Loading collections...</p>}
              {collections.map((collection) => (
                            <Button
                  key={collection.id}
                  variant={selectedCollectionId === collection.id ? "secondary" : "ghost"}
                  onClick={() => setSelectedCollectionId(collection.id)}
                  className="w-full justify-start text-left truncate"
                  title={collection.name}
                >
                  {collection.name}
                            </Button>
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
                <Dialog open={isAddProblemDialogOpen} onOpenChange={setIsAddProblemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedCollectionId || selectedCollectionId === '__ALL_PROBLEMS_VIEW__' || isLoadingCollections}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Problem to Collection
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
            {selectedCollectionId === '__ALL_PROBLEMS_VIEW__' && problemsInView.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                    No problems found in the system.
                </p>
            )}

            {!isLoadingProblems && problemsInView.length > 0 && (
              <div className="space-y-3">
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
                        <DialogTitle>Edit Problem: {editProblemData?.name}</DialogTitle>
                        <DialogDescription>Modify the problem details.</DialogDescription>
                    </DialogHeader>
                    {renderProblemFormFields('edit')}
          <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProblemDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateProblem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
        </div>

      </CardContent>
    </Card>
  );
} 
