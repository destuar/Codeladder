import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useAdmin } from "@/features/admin/AdminContext";
import { api } from "@/lib/api";
import { useLearningPath, Topic, Level, Problem } from "@/hooks/useLearningPath";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Trash, PlusCircle, RefreshCw, FileJson } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LanguageSupport, 
  defaultSupportedLanguages,
  prepareLanguageSupport as prepareMultiLanguageSupport,
  type SupportedLanguage,
  type LanguageData
} from '@/features/languages/components/LanguageSupport';
import { Difficulty as ProblemDifficulty } from '@/features/problems/types'; // Import ProblemDifficulty
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/lib/logger';
import { Difficulty as ProblemDifficultyOriginal } from '@/features/problems/types'; // Keep original alias if used elsewhere in the file extensively
import { ProblemType as ImportedProblemType } from '@/features/problems/types'; // Use imported ProblemType
import { validateAndParseProblemJSON, ValidationResult } from "@/features/admin/utils/problemJSONParser"; // For local parsing feedback
import { ProblemCollectionAdmin, ProblemCollectionAdminRef } from "./ProblemCollectionAdmin";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ProblemType = 'INFO' | 'CODING';

export type NewLevel = {
  name: string;
  description: string;
  order: number;
};

export type NewTopic = {
  name: string;
  description: string;
  content: string;
  order: number;
  slug?: string;
};

export type TestCase = {
  input: string;  
  expected: string;  
  isHidden: boolean;
};

export type PreparedTestCase = {
  input: string;  
  expectedOutput: string; 
  isHidden: boolean;
};

export type FunctionParameter = {
  name: string;
  type: string;
  description?: string;
};

export type NewProblem = {
  name: string;
  content: string;
  difficulty: ProblemDifficultyOriginal; // Use the aliased Difficulty type
  required: boolean;
  reqOrder: number;
  problemType: ImportedProblemType; // Use imported ProblemType
  codeTemplate: string;
  testCases: TestCase[];
  estimatedTime?: number;
  collectionIds: string[];
  slug?: string;
  language: string;
  functionName: string;
  timeLimit: number;
  memoryLimit?: number;
  return_type?: string; 
  params?: FunctionParameter[]; 
};

type DraggedProblem = Problem & {
  originalIndex: number;
  currentIndex: number;
  sourceType?: 'topic' | 'collection';
  sourceId?: string;
};

type ProblemData = {
  name: string;
  content: string;
  difficulty: ProblemDifficulty;
  required: boolean;
  reqOrder: number;
  problemType: ProblemType;
  topicId: string;
  codeTemplate?: string;
  testCases?: string;
  estimatedTime?: number;
  collectionIds: string[];
  slug?: string;
};

interface DynamicCollection {
  id: string;
  name: string;
  description: string | null;
}

type ProblemFormData = {
  name: string;
  content: string;
  difficulty: ProblemDifficulty;
  required: boolean;
  estimatedTime?: number;
  collectionIds?: string[];
};

// More specific type for the edit form data
type EditProblemData = {
  id: string;
  name: string;
  difficulty: ProblemDifficulty;
  required: boolean;
  problemType: ProblemType;
  slug?: string;
  content?: string; // Content is now a direct field for all problem types
  estimatedTime?: number;
  collectionIds: string[];
  reqOrder?: number;
  topicId?: string | null;
  codeProblem?: {
    codeTemplate?: string;
    testCases?: TestCase[];
    language?: string;
    functionName?: string;
    timeLimit?: number;
    memoryLimit?: number;
    return_type?: string;
    params?: FunctionParameter[]; // Updated type
  };
};

// Add cache system for the admin dashboard
// Define cache types
interface ProblemCache {
  [problemId: string]: {
    data: Problem;
    timestamp: number;
  };
}

const updateLevel = (level: Level, updates: Partial<Level>): Level => ({
  ...level,
  ...updates,
  description: updates.description ?? level.description ?? "",
  topics: level.topics
});

const updateTopic = (topic: Topic, updates: Partial<Topic>): Topic => ({
  ...topic,
  ...updates,
  description: updates.description ?? topic.description ?? "",
  content: updates.content ?? topic.content ?? "",
  slug: updates.slug ?? topic.slug ?? "",
  problems: topic.problems
});

const updateProblem = (problem: Problem, updates: Partial<Problem>): Problem => ({
  ...problem,
  ...updates,
  content: updates.content ?? problem.content ?? "",
  reqOrder: updates.reqOrder ?? problem.reqOrder ?? 1,
  slug: updates.slug ?? problem.slug ?? ""
});

/**
 * Displays a badge for a problem collection with appropriate styling
 */
function CollectionBadge({ 
  collectionId, 
  collectionsData 
}: { 
  collectionId: string; 
  collectionsData: DynamicCollection[] 
}) {
  // Get collection info based on ID
  const collectionInfo = collectionsData.find(c => c.id === collectionId);
    
  if (!collectionInfo) return null;
  
  // Generate a consistent color based on the collection name
  const getColorFromName = (name: string) => {
    // Simple hash function to derive a number from a string
    const hash = name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    // Use the hash to select from a predefined set of colors
    const colors = [
      'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20',
      'bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 border-purple-500/20',
      'bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 border-orange-500/20',
      'bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20',
      'bg-red-500/15 text-red-600 hover:bg-red-500/25 border-red-500/20',
      'bg-teal-500/15 text-teal-600 hover:bg-teal-500/25 border-teal-500/20',
      'bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500/25 border-indigo-500/20',
      'bg-pink-500/15 text-pink-600 hover:bg-pink-500/25 border-pink-500/20',
    ];
    
    return colors[hash % colors.length];
  };

  // Generate a short label (first letter of each word or first 2-3 letters)
  const getShortLabel = (name: string) => {
    const words = name.split(' ');
    if (words.length > 1) {
      // Use first letter of each word for multi-word names
      return words.map(word => word[0]).join('').toUpperCase();
    } else {
      // Use first 2-3 letters for single-word names
      return name.slice(0, Math.min(3, name.length)).toUpperCase();
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium transition-colors text-xs ml-1", getColorFromName(collectionInfo.name))}
      title={collectionInfo.name} // Add title for full name on hover
    >
      {getShortLabel(collectionInfo.name)}
    </Badge>
  );
}

// Add a global interface declaration to fix the typescript error
declare global {
  interface Window {
    addProblemToCollection?: (problemId: string, collectionId: string) => Promise<boolean>;
  }
  
  // Add custom event type for problem removal
  interface ProblemRemovedFromTopicEvent extends CustomEvent {
    detail: {
      problemId: string;
      topicId: string;
    };
  }
}

// Add these utility functions after the component types and before the component definition

/**
 * Safely parses a string value that might contain JSON
 * @param value The string value to parse
 * @returns The parsed value or the original value if parsing fails
 */
const tryParseJson = (value: string): any => {
  if (!value || typeof value !== 'string') return value;
  
  try {
    // Try to parse the string as JSON
    return JSON.parse(value);
  } catch (e) {
    // If parsing fails, return the original string
    return value;
  }
};

/**
 * Prepares a test case for API submission by parsing string values to proper objects/arrays
 * @param testCase The test case to prepare
 * @returns A prepared test case with parsed input and expected values
 */
const prepareTestCase = (testCase: TestCase): PreparedTestCase => {
  return {
    input: testCase.input,  // Already a string
    expectedOutput: testCase.expected,  // Already a string
    isHidden: testCase.isHidden
  };
};

/**
 * Normalizes a test case from the API for editing
 * @param testCase The test case from the API
 * @returns A normalized test case for UI editing
 */
const normalizeTestCase = (testCase: any): TestCase => {
  // Helper function to properly normalize values without double-stringifying
  const normalizeValue = (value: any): string => {
    if (value === undefined || value === null) return '';
    
    if (typeof value === 'string') {
      try {
        // Try to parse to see if it's already a JSON string
        const parsed = JSON.parse(value);
        // If it's a primitive value, return the simple representation
        if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean' || parsed === null) {
          return String(parsed);
        }
        // If it's an object/array, keep the JSON string format
        return value;
      } catch (e) {
        // If it doesn't parse, it's a regular string, return as-is
        return value;
      }
    }
    
    // For non-string values, stringify them
    return JSON.stringify(value);
  };
  
  return {
    input: normalizeValue(testCase.input),
    expected: normalizeValue(testCase.expected || testCase.expectedOutput),
    isHidden: !!testCase.isHidden
  };
};

// Add this function to prepare language support data
const prepareLanguageSupport = (
  defaultLanguage: string, 
  supportedLanguages: Record<SupportedLanguage, LanguageData>
): any => {
  return prepareMultiLanguageSupport(defaultLanguage, supportedLanguages);
};

export function LearningPathAdmin() {
  const { token } = useAuth();
  const { setIsAdminView } = useAdmin();
  const navigate = useNavigate();
  const { levels, loading, error, refresh, setLevels } = useLearningPath();
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isAddingProblem, setIsAddingProblem] = useState(false);
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<Record<SupportedLanguage, LanguageData>>(defaultSupportedLanguages);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('python');
  
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [selectedTopicForProblem, setSelectedTopicForProblem] = useState<string | null>(null);
  const [draggedProblem, setDraggedProblem] = useState<DraggedProblem | null>(null);
  const [dropTargetTopic, setDropTargetTopic] = useState<string | null>(null);

  const [newLevel, setNewLevel] = useState<NewLevel>({ 
    name: "", 
    description: "", 
    order: 1 
  });
  
  const [newTopic, setNewTopic] = useState<NewTopic>({ 
    name: "", 
    description: "", 
    content: "", 
    order: 1,
    slug: ""
  });
  
  const [newProblem, setNewProblem] = useState<NewProblem>({
    name: "",
    content: "",
    difficulty: "EASY", // Changed default from EASY_I
    required: false,
    reqOrder: 1,
    problemType: "INFO",
    codeTemplate: "",
    testCases: [{ input: '', expected: '', isHidden: false }],
    estimatedTime: undefined,
    collectionIds: [],
    slug: "",
    language: "javascript",
    functionName: "",
    timeLimit: 5000,
    memoryLimit: undefined,
    return_type: "", // Initialize return_type
    params: [] // Initialize params
  });

  const [isDragging, setIsDragging] = useState(false);

  const [collections, setCollections] = useState<DynamicCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  // Problem cache with 5 minute expiration
  const problemCacheRef = useRef<ProblemCache>({});
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // *** NEW State for Edit Problem Form ***
  const [editProblemData, setEditProblemData] = useState<EditProblemData | null>(null);
  // ***

  const [isLoadingProblems, setIsLoadingProblems] = useState(false); // Add this state

  const problemCollectionAdminRef = useRef<ProblemCollectionAdminRef>(null);
  
  // State for Topic-specific JSON Import Dialog
  const [isUploadJsonToTopicDialogOpen, setIsUploadJsonToTopicDialogOpen] = useState(false);
  const [jsonInputForTopic, setJsonInputForTopic] = useState("");
  const [currentTopicIdForJsonImport, setCurrentTopicIdForJsonImport] = useState<string | null>(null);
  const [jsonParseResultForTopic, setJsonParseResultForTopic] = useState<ValidationResult | null>(null);

  // Add the helper functions here, inside the component
  // Helper function to parse params
  const parseParams = (params: any): FunctionParameter[] => {
    if (!params) return [];
    
    if (typeof params === 'string') {
      try {
        const parsed = JSON.parse(params);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        logger.error("Error parsing params:", error);
        return [];
      }
    }
    
    return Array.isArray(params) ? params : [];
  };

  // Function to handle parameter changes for new problem form  
  const handleParamChange = (index: number, field: string, value: string) => {
    setNewProblem(prev => {
      const params = [...(prev.params || [])];
      
      // If the parameter doesn't exist yet, create it
      if (!params[index]) {
        params[index] = { name: '', type: '' };
      }
      
      // Update the parameter field
      params[index] = { ...params[index], [field]: value };
      
      return { ...prev, params };
    });
  };

  // Function to add a new param to the new problem form
  const handleAddParam = () => {
    setNewProblem(prev => ({
      ...prev,
      params: [...(prev.params || []), { name: '', type: '' }]
    }));
  };

  // Function to remove a param from the new problem form
  const handleRemoveParam = (index: number) => {
    setNewProblem(prev => {
      const params = [...(prev.params || [])];
      params.splice(index, 1);
      return { ...prev, params };
    });
  };

  const handleParseAndAddProblemFromJSONToTopic = async (jsonString: string, defaultTopicId: string | null) => {
    setJsonParseResultForTopic(null);
    if (!token) {
      toast.error("Authentication token not found.");
      return;
    }
    if (!defaultTopicId) {
      toast.error("Target topic ID is missing.");
      return;
    }

    if (!jsonString.trim()) {
      toast.error("JSON input cannot be empty.");
      setJsonParseResultForTopic({ isValid: false, errors: [{ path: ["json"], message: "Input is empty." }], warnings: [] });
      return;
    }

    const result = validateAndParseProblemJSON(jsonString);
    setJsonParseResultForTopic(result);

    if (!result.isValid || !result.parsedData) {
      toast.error("JSON validation failed. Please check the errors below the input form.");
      return;
    }

    const problemDataFromJSON = result.parsedData;

    // Ensure topicId is set: use from JSON if present, otherwise use defaultTopicId
    const finalTopicId = problemDataFromJSON.topicId || defaultTopicId;

    // Determine reqOrder: use from JSON if present, otherwise calculate based on max existing or default to 1
    let finalReqOrder = problemDataFromJSON.reqOrder;
    if (finalReqOrder === undefined) { // If reqOrder is not in the JSON
      const targetTopic = levels.flatMap(l => l.topics).find(t => t.id === finalTopicId);
      if (targetTopic && targetTopic.problems && targetTopic.problems.length > 0) {
        // Calculate reqOrder based on the maximum existing reqOrder in that topic
        const maxExistingReqOrder = targetTopic.problems.reduce((max, p) => Math.max(max, p.reqOrder || 0), 0);
        finalReqOrder = maxExistingReqOrder + 1;
      } else {
        // Topic is empty or not found, so this will be the first problem
        finalReqOrder = 1;
      }
    }

    let apiPayload: any = {
      name: problemDataFromJSON.name,
      content: problemDataFromJSON.content,
      difficulty: problemDataFromJSON.difficulty,
      problemType: problemDataFromJSON.problemType,
      required: problemDataFromJSON.required !== undefined ? problemDataFromJSON.required : true, // Default required to true if not in JSON
      reqOrder: finalReqOrder, // Use the determined reqOrder
      slug: problemDataFromJSON.slug,
      estimatedTime: problemDataFromJSON.estimatedTime,
      collectionIds: problemDataFromJSON.collectionIds || [],
      topicId: finalTopicId, // Crucial: ensures problem is linked to a topic
    };

    if (problemDataFromJSON.problemType === 'CODING' && problemDataFromJSON.coding) {
      apiPayload.defaultLanguage = problemDataFromJSON.coding.languages.defaultLanguage;
      const languageSupportPayload: Record<string, { template: string, reference?: string, enabled: boolean }> = {};
      Object.entries(problemDataFromJSON.coding.languages.supported).forEach(([lang, data]) => {
        if (data) {
          languageSupportPayload[lang] = { template: data.template, reference: data.reference || "", enabled: true };
        }
      });
       // Ensure the default language itself has its template/reference if provided
      if (problemDataFromJSON.coding.languages.supported[problemDataFromJSON.coding.languages.defaultLanguage] &&
          !languageSupportPayload[problemDataFromJSON.coding.languages.defaultLanguage]) {
          languageSupportPayload[problemDataFromJSON.coding.languages.defaultLanguage] = {
              template: problemDataFromJSON.coding.languages.supported[problemDataFromJSON.coding.languages.defaultLanguage]!.template,
              reference: problemDataFromJSON.coding.languages.supported[problemDataFromJSON.coding.languages.defaultLanguage]!.reference || "",
              enabled: true,
          };
      }

      apiPayload.languageSupport = JSON.stringify(languageSupportPayload);
      apiPayload.functionName = problemDataFromJSON.coding.functionName;
      apiPayload.timeLimit = problemDataFromJSON.coding.timeLimit;
      apiPayload.memoryLimit = problemDataFromJSON.coding.memoryLimit;
      apiPayload.return_type = problemDataFromJSON.coding.returnType;
      apiPayload.params = JSON.stringify(problemDataFromJSON.coding.parameters || []);
      apiPayload.testCases = JSON.stringify(
        (problemDataFromJSON.coding.testCases || []).map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        }))
      );
    } else if (problemDataFromJSON.problemType === 'CODING' && !problemDataFromJSON.coding) {
      toast.error("CODING problem type selected in JSON, but 'coding' object details are missing or invalid.");
      setJsonParseResultForTopic({
        isValid: false,
        errors: [{ path: ["coding"], message: "CODING problem type selected, but 'coding' object details are missing or invalid." }],
        warnings: result.warnings || []
      });
      return;
    }
    
    // Log the final payload for debugging
    logger.debug("Final API Payload for JSON import to topic:", apiPayload);

    try {
      // Using POST /problems as per the parser's design, assuming backend routes topicId in payload
      await api.post('/problems', apiPayload, token);
      toast.success(`Problem "${apiPayload.name}" added successfully to topic!`);
      refresh(); // Refresh the learning path data
      setIsUploadJsonToTopicDialogOpen(false); // Close dialog on success
      setJsonInputForTopic(""); // Reset input
      setJsonParseResultForTopic(null); // Reset parse result
    } catch (err) {
      logger.error('Error adding problem from JSON to topic:', err);
      toast.error('Failed to add problem from JSON. ' + ((err as Error).message || 'Check console for details.'));
      // Keep dialog open for correction
    }
  };

  // Listen for problem removal events from the ProblemCollectionAdmin component
  useEffect(() => {
    const handleProblemRemovedFromTopic = (event: ProblemRemovedFromTopicEvent) => {
      const { problemId, topicId } = event.detail;
      logger.debug(`Received event: Problem ${problemId} removed from topic ${topicId}`);
      
      // Update our local state to remove the problem from the topic
      setLevels(currentLevels => 
        currentLevels.map(level => ({
          ...level,
          topics: level.topics.map(topic => {
            if (topic.id === topicId) {
              return {
                ...topic,
                problems: topic.problems.filter(p => p.id !== problemId)
              };
            }
            return topic;
          })
        }))
      );
    };
    
    // Add event listener
    window.addEventListener('problem-removed-from-topic', handleProblemRemovedFromTopic as EventListener);
    
    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('problem-removed-from-topic', handleProblemRemovedFromTopic as EventListener);
    };
  }, [setLevels]);

  // Helper function to get a problem from cache or fetch it
  const getProblem = async (problemId: string): Promise<Problem> => {
    const now = Date.now();
    const cached = problemCacheRef.current[problemId];
    
    // If we have a valid cached version, use it
    if (cached && now - cached.timestamp < CACHE_EXPIRY) {
      return cached.data;
    }
    
    // Otherwise fetch and cache the problem
    try {
      const problem = await api.get(`/problems/${problemId}`, token) as Problem;
      problemCacheRef.current[problemId] = {
        data: problem,
        timestamp: now
      };
      return problem;
    } catch (error) {
      logger.error(`Error fetching problem ${problemId}:`, error);
      throw error;
    }
  };
  
  // Function to clear a problem from cache when it's updated
  const invalidateProblemCache = (problemId: string) => {
    if (problemCacheRef.current[problemId]) {
      delete problemCacheRef.current[problemId];
    }
  };

  useEffect(() => {
    const fetchCollections = async () => {
      if (!token) return;
      
      setLoadingCollections(true);
      try {
        const data = await api.get("/admin/collections", token);
        setCollections(data);
      } catch (error) {
        logger.error("Error fetching collections:", error);
      } finally {
        setLoadingCollections(false);
      }
    };
    
    fetchCollections();
  }, [token]);

  const handleAddLevel = async () => {
    try {
      logger.debug('Adding new level:', newLevel);
      await api.post("/learning/levels", newLevel, token);
      setIsAddingLevel(false);
      setNewLevel({ name: "", description: "", order: 1 });
      toast.success("Level added successfully");
      refresh();
    } catch (err) {
      logger.error("Error adding level", err);
      if (err instanceof Error) {
        toast.error(`Failed to add level: ${err.message}`);
      } else {
        toast.error("Failed to add level");
      }
    }
  };

  const handleEditLevel = async () => {
    if (!selectedLevel) return;
    try {
      const updatedLevel = {
        name: selectedLevel.name,
        description: selectedLevel.description || "",
        order: selectedLevel.order
      };
      await api.put(`/learning/levels/${selectedLevel.id}`, updatedLevel, token);
      setIsEditingLevel(false);
      setSelectedLevel(null);
      toast.success("Level updated successfully");
      refresh();
    } catch (err) {
      logger.error("Error updating level", err);
      if (err instanceof Error) {
        toast.error(`Failed to update level: ${err.message}`);
      } else {
        toast.error("Failed to update level");
      }
    }
  };

  const handleAddTopic = async () => {
    if (!selectedLevel) return;
    try {
      await api.post(`/learning/levels/${selectedLevel.id}/topics`, newTopic, token);
      setIsAddingTopic(false);
      setNewTopic({ name: "", description: "", content: "", order: 1, slug: "" });
      setSelectedLevel(null);
      toast.success("Topic added successfully");
      refresh();
    } catch (err) {
      logger.error("Error adding topic", err);
      if (err instanceof Error) {
        toast.error(`Failed to add topic: ${err.message}`);
      } else {
        toast.error("Failed to add topic");
      }
    }
  };

  const handleEditTopic = async () => {
    if (!selectedTopic) return;
    try {
      const updatedTopic = {
        name: selectedTopic.name,
        description: selectedTopic.description || "",
        content: selectedTopic.content || "",
        order: selectedTopic.order,
        slug: selectedTopic.slug || ""
      };
      await api.put(`/learning/topics/${selectedTopic.id}`, updatedTopic, token);
      setIsEditingTopic(false);
      setSelectedTopic(null);
      toast.success("Topic updated successfully");
      refresh();
    } catch (err) {
      logger.error("Error updating topic", err);
      if (err instanceof Error) {
        toast.error(`Failed to update topic: ${err.message}`);
      } else {
        toast.error("Failed to update topic");
      }
    }
  };

  const handleAddProblem = async () => {
    if (!selectedTopic) return;
    try {
      // Prepare the problem payload
      const problemPayload: any = {
        name: newProblem.name,
        content: newProblem.content || '',
        difficulty: newProblem.difficulty,
        required: newProblem.required,
        problemType: newProblem.problemType,
        reqOrder: newProblem.reqOrder,
        estimatedTime: newProblem.estimatedTime,
        collectionIds: newProblem.collectionIds || [],
        slug: newProblem.slug || "",
        topicId: selectedTopic.id
      };
      
      // For coding problems, add the coding-specific fields
      if (newProblem.problemType === 'CODING') {
        // Add code problem fields
        problemPayload.defaultLanguage = defaultLanguage; // Send the current default language
        problemPayload.functionName = newProblem.functionName || '';
        problemPayload.timeLimit = newProblem.timeLimit || 5000;
        problemPayload.memoryLimit = newProblem.memoryLimit;
        
        // Prepare language support data using the utility and current state
        // This is the corrected part:
        problemPayload.languageSupport = JSON.stringify(
          prepareLanguageSupport(defaultLanguage, supportedLanguages) // Use the main state
        );
        
        // The individual newProblem.codeTemplate is now part of supportedLanguages state
        // The backend will use languageSupport.defaultLanguage.template
        // problemPayload.codeTemplate = newProblem.codeTemplate || ''; // This might be for Problem.codeTemplate (legacy)
        
        // Process test cases
        if (newProblem.testCases && newProblem.testCases.length > 0) {
          const preparedTestCases = newProblem.testCases.map(testCase => {
            // Helper function to avoid double-stringifying
            const ensureJsonString = (value: any): string => {
              if (typeof value === 'string') {
                try {
                  JSON.parse(value);
                  return value; // Already valid JSON string
                } catch (e) {
                  return JSON.stringify(value); // Raw string, needs stringifying
                }
              }
              return JSON.stringify(value); // Non-string value, stringify it
            };
            
            return {
              input: ensureJsonString(testCase.input),
              expectedOutput: ensureJsonString(testCase.expected),
              isHidden: testCase.isHidden
            };
          });
          problemPayload.testCases = JSON.stringify(preparedTestCases);
        }
        
        // Add params if provided
        if (newProblem.params && newProblem.params.length > 0) {
          problemPayload.params = JSON.stringify(newProblem.params);
        }
        
        // Add return type if provided
        if (newProblem.return_type) {
          problemPayload.return_type = newProblem.return_type;
        }
      }

      logger.debug('Creating problem with payload:', problemPayload);

      // Create the problem with all necessary fields
      const createdProblem = await api.post("/problems", problemPayload, token);
      
      logger.debug('Created problem:', createdProblem);
      
      setIsAddingProblem(false);
      
      // Reset form state
      setNewProblem({
        name: "",
        content: "",
        difficulty: "EASY", // Changed default from EASY_I
        required: false,
        reqOrder: 1,
        problemType: "INFO",
        codeTemplate: "",
        testCases: [{ input: '', expected: '', isHidden: false }],
        estimatedTime: undefined,
        collectionIds: [],
        slug: "",
        language: "javascript",
        functionName: "",
        timeLimit: 5000,
        memoryLimit: undefined,
        return_type: "",
        params: []
      });
      
      toast.success("Problem added successfully");
      refresh();
    } catch (err) {
      logger.error("Error adding problem", err);
      if (err instanceof Error) {
        toast.error(`Failed to add problem: ${err.message}`);
      } else {
        toast.error("Failed to add problem");
      }
    }
  };

  // *** NEW State Handler for Edit Form Inputs ***
  const handleEditProblemInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditProblemData(prev => {
      if (!prev) return null;
      const updatedValue = type === 'number' ? (value === '' ? undefined : parseInt(value) || undefined) : value;
      return { ...prev, [name]: updatedValue };
    });
  }, []);

  const handleEditProblemCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEditProblemData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: checked };
    });
  }, []);

  const handleEditProblemSelectChange = useCallback((name: keyof EditProblemData | keyof NonNullable<EditProblemData['codeProblem']>, value: any) => {
    setEditProblemData((prev) => {
      if (!prev) return null;

      // Special handling for problemType changes
      if (name === 'problemType') {
        // When switching to INFO, save content and reset coding fields
        if (value === 'INFO') {
          const content = prev.content || '';
          return {
            ...prev,
            problemType: value as ProblemType,
            content, // Keep the content
            codeProblem: undefined // Set to undefined instead of null
          };
        } 
        // When switching to CODING, initialize codeProblem
        else if (value === 'CODING') {
          return {
            ...prev,
            problemType: value as ProblemType,
            // Initialize codeProblem with defaults
            codeProblem: {
              codeTemplate: '',
              testCases: [{ input: '', expected: '', isHidden: false }],
              language: 'javascript',
              functionName: 'solution',
              timeLimit: 5000,
              memoryLimit: undefined,
              return_type: '',
              params: []
            }
          };
        }
        return {
          ...prev,
          [name]: value as ProblemType
        };
      }

      // Handle language change
      if (name === 'language') {
        // Update default language in language support state
        setDefaultLanguage(value);
        
        // Update the language support state to enable the new language
        const initialLanguageSupport = { ...defaultSupportedLanguages };
        initialLanguageSupport[value as SupportedLanguage] = {
          ...initialLanguageSupport[value as SupportedLanguage],
          enabled: true,
          template: prev.codeProblem?.codeTemplate || ''
        };
        setSupportedLanguages(initialLanguageSupport);
      }

      // Handle codeProblem fields
      if (name in (prev.codeProblem || {}) && prev.codeProblem) {
        return {
          ...prev,
          codeProblem: {
            ...prev.codeProblem,
            [name]: value,
          },
        };
      }
      // Handle top-level fields
      return { ...prev, [name]: value };
    });
  }, []);

  const handleEditProblemCodeProblemChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditProblemData(prev => {
      if (!prev) return null;
      
      // If codeProblem is undefined, initialize it first
      const currentCodeProblem = prev.codeProblem || {
        codeTemplate: '',
        testCases: [{ input: '', expected: '', isHidden: false }],
        language: 'javascript',
        functionName: 'solution',
        timeLimit: 5000,
        memoryLimit: undefined,
        return_type: '',
        params: []
      };
      
      // Update the code template in language support state
      if (name === 'codeTemplate') {
        const initialLanguageSupport = { ...defaultSupportedLanguages };
        initialLanguageSupport[defaultLanguage as SupportedLanguage] = {
          ...initialLanguageSupport[defaultLanguage as SupportedLanguage],
          enabled: true,
          template: value
        };
        setSupportedLanguages(initialLanguageSupport);
      }
      
      return {
        ...prev,
        codeProblem: {
          ...currentCodeProblem,
          [name]: value,
        },
      };
    });
  }, [defaultLanguage]);

  const handleEditTestCaseChange = useCallback((index: number, field: string, value: string | boolean) => {
    setEditProblemData(prev => {
      if (!prev || !prev.codeProblem) return prev;
      
      // Create a copy of testCases, ensuring it's defined
      const testCases = prev.codeProblem.testCases ? [...prev.codeProblem.testCases] : [];
      
      // If index exists, update the field
      if (testCases[index]) {
        const updatedTestCase = { ...testCases[index] } as any;
        updatedTestCase[field] = value;
        testCases[index] = updatedTestCase;
      }
      
      return { 
        ...prev, 
        codeProblem: { 
          ...prev.codeProblem, 
          testCases: testCases 
        } 
      };
    });
  }, []);

  const handleAddEditTestCase = useCallback(() => {
    setEditProblemData(prev => {
      if (!prev || !prev.codeProblem) return prev;
      
      // Create a copy of testCases, ensuring it's defined
      const testCases = prev.codeProblem.testCases ? [...prev.codeProblem.testCases] : [];
      
      return {
        ...prev,
        codeProblem: {
          ...prev.codeProblem,
          testCases: [
            ...testCases,
            { input: '', expected: '', isHidden: false }
          ]
        }
      };
    });
  }, []);

  const handleRemoveEditTestCase = useCallback((index: number) => {
    setEditProblemData(prev => {
      if (!prev || !prev.codeProblem) return prev;
      
      // Create a copy of testCases, ensuring it's defined
      const testCases = prev.codeProblem.testCases ? [...prev.codeProblem.testCases] : [];
      
      // Only remove if there's more than one test case
      if (testCases.length <= 1) return prev;
      
      return {
        ...prev,
        codeProblem: { 
          ...prev.codeProblem, 
          testCases: testCases.filter((_, i) => i !== index) 
        }
      };
    });
  }, []);

  const handleEditProblem = async () => {
    if (!editProblemData) {
      toast.error("No problem data to save.");
      return;
    }

    try {
      invalidateProblemCache(editProblemData.id);
      
      const problemPayload: any = {
        name: editProblemData.name,
        difficulty: editProblemData.difficulty,
        required: editProblemData.required,
        problemType: editProblemData.problemType,
        slug: editProblemData.slug || "",
        estimatedTime: editProblemData.estimatedTime || null,
        collectionIds: editProblemData.collectionIds || [],
        content: editProblemData.content || "", // Always include content
      };

      // For CODING problems, include coding fields
      if (editProblemData.problemType === 'CODING' && editProblemData.codeProblem) {
        // Set default language
        problemPayload.defaultLanguage = defaultLanguage;
        
        // Create language support structure
        problemPayload.languageSupport = JSON.stringify(
          prepareLanguageSupport(defaultLanguage, supportedLanguages)
        );
        
        // Add code problem fields
        problemPayload.codeTemplate = editProblemData.codeProblem.codeTemplate; // For backward compatibility
        problemPayload.functionName = editProblemData.codeProblem.functionName;
        problemPayload.timeLimit = editProblemData.codeProblem.timeLimit;
        problemPayload.memoryLimit = editProblemData.codeProblem.memoryLimit;
        problemPayload.return_type = editProblemData.codeProblem.return_type;
        problemPayload.params = JSON.stringify(editProblemData.codeProblem.params || []);
        
        // Process test cases
        const preparedTestCases = (editProblemData.codeProblem.testCases || []).map(prepareTestCase);
        problemPayload.testCases = JSON.stringify(preparedTestCases);
      }

      // Handle topic change separately (if logic is needed)
      const currentTopicId = selectedProblem?.topic?.id || null;
      const newTopicId = editProblemData.topicId;

      if (newTopicId !== currentTopicId) {
        // If topic changed, update the base problem first without topic info
        await api.put(`/problems/${editProblemData.id}`, problemPayload, token);
        
        // Now handle the topic change
        if (newTopicId === null) {
          // Moved to "no topic"
          await api.put(`/problems/${editProblemData.id}/remove-topic`, {}, token);
          toast.success("Problem updated and removed from topic");
        } else {
          // Moved to a different topic
          await api.post(`/learning/topics/${newTopicId}/problems/${editProblemData.id}`, {}, token);
          toast.success("Problem updated and moved to new topic");
        }
      } else {
        // Topic didn't change, just update problem with potentially new reqOrder
        if (editProblemData.reqOrder) {
          problemPayload.reqOrder = editProblemData.reqOrder;
        }
        await api.put(`/problems/${editProblemData.id}`, problemPayload, token);
        toast.success("Problem updated successfully");
      }

      setIsEditingProblem(false);
      setEditProblemData(null);
      setSelectedProblem(null);
      refresh();
    } catch (err) {
      logger.error("Error updating problem", err);
      toast.error("Failed to update problem");
    }
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedLevel) return;
    const { name, value } = e.target;
    const updatedValue = name === 'order' ? parseInt(value) : value;
    setSelectedLevel(prev => prev ? updateLevel(prev, { [name]: updatedValue }) : null);
  };
  
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedTopic) return;
    const { name, value } = e.target;
    const updatedValue = name === 'order' ? parseInt(value) : value;
    setSelectedTopic(prev => prev ? updateTopic(prev, { [name]: updatedValue }) : null);
  };

  const handleProblemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProblem(prev => ({
      ...prev,
      [name]: name === 'reqOrder' ? (value === '' ? 1 : Math.max(1, parseInt(value) || 1)) : value
    }));
  };
  
  const handleProblemTypeChange = (value: string) => {
    setNewProblem(prev => ({
      ...prev,
      problemType: value as ProblemType,
      // Reset coding-specific fields when switching to INFO type
      ...(value === 'INFO' ? {
        codeTemplate: '',
        testCases: [{ input: '', expected: '', isHidden: false }],
        language: "javascript",
        functionName: "",
        timeLimit: 5000,
        memoryLimit: undefined,
        return_type: "", // Reset return_type
        params: [] // Reset params
      } : {})
    }));

    // Reset language support state when switching problem type
    if (value === 'INFO') {
      setSupportedLanguages(defaultSupportedLanguages);
      setDefaultLanguage('python');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await api.delete(`/learning/topics/${topicId}`, token);
      toast.success("Topic deleted successfully");
      refresh();
    } catch (err) {
      logger.error("Error deleting topic", err);
      if (err instanceof Error) {
        toast.error(`Failed to delete topic: ${err.message}`);
      } else {
        toast.error("Failed to delete topic");
      }
    }
  };
  
  const handleDeleteProblem = async (problemId: string) => {
    try {
      await api.delete(`/learning/problems/${problemId}`, token);
      toast.success("Problem deleted successfully");
      refresh();
    } catch (err) {
      logger.error("Error deleting problem", err);
      if (err instanceof Error) {
        toast.error(`Failed to delete problem: ${err.message}`);
      } else {
        toast.error("Failed to delete problem");
      }
    }
  };

  const handleEditProblemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedProblem) return;
    const { name, value } = e.target;
    
    // If it's the content field, update it directly on the problem
    if (name === 'content') {
      setSelectedProblem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          content: value
        };
      });
      return;
    }
    
    // Handle other fields
    setSelectedProblem(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: name === 'required' 
          ? value === 'true' 
          : name === 'estimatedTime' || name === 'reqOrder'
            ? value === '' ? undefined : parseInt(value) 
            : value
      };
    });
  };

  // Add helper function to add problems to a specific collection
  const addProblemToCollection = async (problemId: string, collectionId: string) => {
    try {
      await api.post(`/admin/collections/${collectionId}/problems`, { problemId }, token);
      toast.success("Problem added to collection");
      return true;
    } catch (err) {
      logger.error("Error adding problem to collection", err);
      toast.error("Failed to add problem to collection");
      return false;
    }
  };

  // Update handleDragStart to expose method via the window interface
  const handleDragStart = (e: React.DragEvent, problem: Problem, index: number, topicId: string) => {
    setIsDragging(true);
    setDraggedProblem({ 
      ...problem, 
      originalIndex: index, 
      currentIndex: index,
      sourceType: 'topic',
      sourceId: topicId
    });
    
    // Prepare data for cross-component drag
    const dragData = {
      type: 'problem',
      problemId: problem.id,
      sourceType: 'topic',
      sourceId: topicId,
      problem: problem
    };
    
    // Set the drag data in the dataTransfer object
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Set a ghost image with the problem name and make it visible during drag
    const ghostElement = document.createElement('div');
    ghostElement.classList.add('fixed', 'bg-background', 'border', 'rounded-md', 'p-2', 'opacity-90', 'text-foreground', 'text-sm', 'font-medium', 'shadow-md', 'z-50');
    ghostElement.innerText = problem.name;
    document.body.appendChild(ghostElement);
    
    // Position the ghost element near the cursor but not directly under it
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = `${e.clientY - 10}px`;
    ghostElement.style.left = `${e.clientX + 15}px`;
    e.dataTransfer.setDragImage(ghostElement, 10, 10);
    
    // Clean up ghost element after drag
    setTimeout(() => {
      try {
        document.body.removeChild(ghostElement);
      } catch (err) {
        logger.debug('Ghost element already removed');
      }
    }, 100);
    
    // Make this function globally available during drag operations
    window.addProblemToCollection = addProblemToCollection;
  };

  const handleDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedProblem || draggedProblem.currentIndex === overIndex) return;
    
    // Only allow reordering within the same topic
    if (draggedProblem.sourceType === 'topic') {
      setDraggedProblem(prev => prev ? { ...prev, currentIndex: overIndex } : null);
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDropOnTopic = async (e: React.DragEvent, targetTopicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual indicator
    e.currentTarget.classList.remove('border-dashed', 'border-2', 'border-primary', 'bg-primary/10');
    
    try {
      // Get drag data
      const dragDataString = e.dataTransfer.getData('application/json');
      if (!dragDataString) {
        logger.debug("No drag data found");
        return;
      }
      
      const dragData = JSON.parse(dragDataString);
      logger.debug("Processing drop on topic with data:", dragData);
      
      // Only handle problem drags
      if (dragData.type !== 'problem') return;
      
      // We will need this problem's full data, get it from cache if possible
      let problem;
      try {
        problem = await getProblem(dragData.problemId);
        // Immediately invalidate the cache as we'll be modifying this problem
        invalidateProblemCache(dragData.problemId);
      } catch (err) {
        logger.error("Error getting problem data for drop:", err);
        toast.error("Failed to process drag - could not get problem data");
        return;
      }
      
      if (dragData.sourceType === 'topic') {
        // Skip if source and target topics are the same
        if (dragData.sourceId === targetTopicId) {
          logger.debug("Same topic, skipping API call");
          return;
        }
        
        // Call API to move problem between topics
        try {
          await api.post(`/learning/topics/${targetTopicId}/problems/${dragData.problemId}`, {}, token);
          toast.success("Problem moved to new topic");
          
          // Only refresh if needed or use a more targeted approach
          const targetTopic = levels.flatMap(l => l.topics).find(t => t.id === targetTopicId);
          const sourceTopic = levels.flatMap(l => l.topics).find(t => t.id === dragData.sourceId);
          
          if (targetTopic && sourceTopic) {
            // Update specific topics instead of full refresh
            const updatedTopics = [...levels.flatMap(l => l.topics)];
            const targetIndex = updatedTopics.findIndex(t => t.id === targetTopicId);
            const sourceIndex = updatedTopics.findIndex(t => t.id === dragData.sourceId);
            
            if (targetIndex !== -1 && sourceIndex !== -1) {
              // Move problem from source to target in local state
              const problemToMove = sourceTopic.problems.find(p => p.id === dragData.problemId);
              if (problemToMove) {
                // Update source topic
                updatedTopics[sourceIndex] = {
                  ...sourceTopic,
                  problems: sourceTopic.problems.filter(p => p.id !== dragData.problemId)
                };
                
                // Update target topic
                updatedTopics[targetIndex] = {
                  ...targetTopic,
                  problems: [...targetTopic.problems, problemToMove]
                };
                
                // Update all levels
                const updatedLevels = levels.map(level => ({
                  ...level,
                  topics: level.topics.map(topic => {
                    const updatedTopic = updatedTopics.find(t => t.id === topic.id);
                    return updatedTopic || topic;
                  })
                }));
                
                setLevels(updatedLevels);
              } else {
                // Fall back to complete refresh if local update fails
                refresh();
              }
            } else {
              refresh(); // Fall back to complete refresh
            }
          } else {
            refresh(); // Fall back to complete refresh
          }
        } catch (err) {
          logger.error("Error moving problem between topics:", err);
          toast.error("Failed to move problem to new topic");
        }
      } 
      else if (dragData.sourceType === 'collection') {
        // Handle problem from collection added to topic
        try {
          // If the problem has a topic, first remove it from that topic
          if (problem.topic) {
            try {
              await api.delete(`/learning/topics/problems/${problem.id}`, token);
              logger.debug("Removed problem from previous topic");
            } catch (removeError) {
              logger.error("Error removing from previous topic:", removeError);
              // Try fallback method
              try {
                await api.put(`/problems/${problem.id}/remove-topic`, {}, token);
                logger.debug("Removed problem from previous topic (fallback method)");
              } catch (fallbackError) {
                logger.error("Failed with fallback method too:", fallbackError);
                toast.error("Failed to move problem - could not remove from previous topic");
                return;
              }
            }
          }
          
          // Now add to the new topic
          await api.post(`/learning/topics/${targetTopicId}/problems/${problem.id}`, {}, token);
          toast.success("Problem added to topic");
          
          // Refresh to get updated state
          refresh();
          
        } catch (err) {
          logger.error("Error adding collection problem to topic:", err);
          toast.error("Failed to add problem to topic");
        }
      }
      
    } catch (error) {
      logger.error("Error handling drop on topic:", error);
      toast.error("Failed to process drop operation");
    } finally {
      setDropTargetTopic(null);
      setDraggedProblem(null);
    }
  };

  // Clean up global window method when drag ends
  const handleDragEnd = async (topicId: string, problems: Problem[]) => {
    if (!draggedProblem) return;
    
    setIsDragging(false);
    
    // Clean up the window method
    window.addProblemToCollection = undefined;
    
    if (draggedProblem.sourceType === 'collection') {
      // Handle drop from collection to topic (no action needed yet)
      setDraggedProblem(null);
      return;
    }
    
    const { originalIndex, currentIndex } = draggedProblem;
    if (originalIndex === currentIndex) {
      setDraggedProblem(null);
      return;
    }

    // Create new order for all problems
    const reorderedProblems = [...problems];
    const [movedProblem] = reorderedProblems.splice(originalIndex, 1);
    reorderedProblems.splice(currentIndex, 0, movedProblem);
    
    // Update order numbers
    const problemOrders = reorderedProblems.map((problem, index) => ({
      id: problem.id,
      reqOrder: index + 1
    }));

    // Optimistically update the UI
    const updatedLevels = levels.map(level => ({
      ...level,
      topics: level.topics.map(topic => {
        if (topic.id === topicId) {
          return {
            ...topic,
            problems: reorderedProblems.map((problem, index) => ({
              ...problem,
              reqOrder: index + 1
            }))
          };
        }
        return topic;
      })
    }));
    setLevels(updatedLevels);

    try {
      await api.post('/problems/reorder', { problemOrders }, token);
    } catch (err) {
      logger.error('Error reordering problems:', err);
      toast.error('Failed to reorder problems');
      refresh(); // Only refresh on error to get back to the server state
    }
    
    setDraggedProblem(null);
  };

  // Update the click handler to set the NEW editProblemData state
  const handleEditProblemClick = (problem: Problem) => {
    setIsLoadingProblems(true);
    api.get(`/problems/${problem.id}`, token)
      .then(problemDetails => {
        logger.debug("[LearningPathAdmin] Fetched problemDetails:", problemDetails);

        // Normalize test cases from the API to ensure they're ready for editing
        const normalizedTestCases = problemDetails.codeProblem?.testCases 
          ? (Array.isArray(problemDetails.codeProblem.testCases) 
              ? problemDetails.codeProblem.testCases.map(normalizeTestCase)
              : typeof problemDetails.codeProblem.testCases === 'string' 
                ? tryParseJson(problemDetails.codeProblem.testCases).map(normalizeTestCase)
                : [{ input: '', expected: '', isHidden: false }])
          : [{ input: '', expected: '', isHidden: false }];
          
        // Initialize language support state
        if (problemDetails.codeProblem) {
          try {
            const languageSupportData = problemDetails.codeProblem.languageSupport;
            if (languageSupportData && typeof languageSupportData === 'object' && Object.keys(languageSupportData).length > 0) {
              const initialLanguageSupportState = JSON.parse(JSON.stringify(defaultSupportedLanguages));
              Object.entries(languageSupportData).forEach(([lang, data]: [string, any]) => {
                if (lang in initialLanguageSupportState) {
                  initialLanguageSupportState[lang as SupportedLanguage] = {
                    enabled: true, 
                    template: data.template || '',
                    reference: data.reference || ''
                  };
                }
              });
              setSupportedLanguages(initialLanguageSupportState);
              setDefaultLanguage(problemDetails.codeProblem.defaultLanguage || 'python');
            } else if (problemDetails.codeProblem.codeTemplate) { 
              const initialLanguageSupportState = JSON.parse(JSON.stringify(defaultSupportedLanguages));
              const legacyLang = (problemDetails.codeProblem.defaultLanguage || problemDetails.codeProblem.language || 'python') as SupportedLanguage;
              if (legacyLang in initialLanguageSupportState) {
                 initialLanguageSupportState[legacyLang] = {
                    ...initialLanguageSupportState[legacyLang],
                    enabled: true,
                    template: problemDetails.codeProblem.codeTemplate,
                  };
              }
              setSupportedLanguages(initialLanguageSupportState);
              setDefaultLanguage(legacyLang);
            } else {
                setSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
                setDefaultLanguage('python');
            }
          } catch (err) {
            logger.error('[LearningPathAdmin] Error processing language support from API:', err);
            setSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
            setDefaultLanguage('python');
          }
        } else { 
            setSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
            setDefaultLanguage('python');
        }
          
        const dataForEditForm = {
          ...problemDetails,
          topicId: problemDetails.topic?.id || null,
          codeProblem: problemDetails.codeProblem ? {
            language: problemDetails.codeProblem.language || 'javascript',
            codeTemplate: problemDetails.codeProblem.codeTemplate || '',
            functionName: problemDetails.codeProblem.functionName || '',
            timeLimit: problemDetails.codeProblem.timeLimit || 5000,
            memoryLimit: problemDetails.codeProblem.memoryLimit,
            return_type: problemDetails.codeProblem.return_type || '',
            params: parseParams(problemDetails.codeProblem.params),
            testCases: normalizedTestCases,
          } : undefined,
        };
        setEditProblemData(dataForEditForm);
        setSelectedProblem(problemDetails);
        setIsEditingProblem(true);

        logger.debug("[LearningPathAdmin] Set editProblemData to:", dataForEditForm);
        logger.debug("[LearningPathAdmin] Set isEditingProblem to true.");

      })
      .catch(err => {
        logger.error("[LearningPathAdmin] Error fetching problem details:", err);
        toast.error("Could not fetch latest problem details");
        // Fallback logic from original file
        setEditProblemData({
            id: problem.id,
            name: problem.name || '',
            difficulty: (problem.difficulty as ProblemDifficulty) || 'EASY',
            required: problem.required || false,
            problemType: (problem.problemType as ProblemType) || 'INFO',
            slug: problem.slug,
            content: problem.content,
            estimatedTime: problem.estimatedTime,
            collectionIds: problem.collectionIds || [],
            reqOrder: problem.reqOrder,
            topicId: problem.topic?.id || null,
            codeProblem: undefined
        });
        setSelectedProblem(problem);
        setIsEditingProblem(true);
        setSupportedLanguages(defaultSupportedLanguages);
        setDefaultLanguage('python');
      })
      .finally(() => {
        setIsLoadingProblems(false);
        logger.debug("[LearningPathAdmin] Finished handleEditProblemClick, isLoadingProblems:", false);
      });
  };

  // Function to handle View button click - exit admin view and navigate to problem
  const handleViewProblem = (problemId: string) => {
    // Exit admin view
    setIsAdminView(false);
    // Navigate to the problem
    navigate(`/problems/${problemId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 bg-background min-h-[400px]">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoadingProblems) {
    return (
      <div className="flex justify-center items-center p-8">
        <PageLoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learning Path Management Header and "Add New Level" button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Learning Path Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage levels, topics, and problems within the structured learning path.
          </p>
        </div>
        <Dialog open={isAddingLevel} onOpenChange={setIsAddingLevel}>
          <DialogTrigger asChild>
            <Button>Add New Level</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
            <DialogHeader>
              <DialogTitle>Add New Level</DialogTitle>
              <DialogDescription>Create a new level in the learning path.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="add-level-name-lp">Name</Label> 
                <Input id="add-level-name-lp" value={newLevel.name} onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })} placeholder="e.g., Level 1" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-level-description-lp">Description</Label>
                <Textarea id="add-level-description-lp" value={newLevel.description} onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })} placeholder="Describe this level..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-level-order-lp">Order</Label>
                <Input id="add-level-order-lp" type="number" value={newLevel.order} onChange={(e) => setNewLevel({ ...newLevel, order: parseInt(e.target.value) || 1 })} min={1} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingLevel(false)}>Cancel</Button>
              <Button onClick={handleAddLevel}>Add Level</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Levels, Topics, Problems mapping */}
      <div className="grid gap-6">
        {levels.map((level) => (
          <Card key={level.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-2xl">{level.name}</CardTitle>
                <CardDescription>{level.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    logger.debug("[LearningPathAdmin] Edit Level button clicked for level:", level);
                    setSelectedLevel(level);
                    logger.debug("[LearningPathAdmin] setSelectedLevel called with:", level);
                    setIsEditingLevel(true);
                    logger.debug("[LearningPathAdmin] setIsEditingLevel called with true.");
                  }}
                >
                  Edit Level
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedLevel(level);
                    setIsAddingTopic(true);
                  }}
                >
                  Add Topic
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {level.topics.map((topic) => (
                  <Card key={topic.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle>{topic.name}</CardTitle>
                        {topic.slug && (
                          <div className="text-xs text-muted-foreground">
                            Slug: {topic.slug}
                          </div>
                        )}
                        <CardDescription>{topic.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // logger.debug("[LearningPathAdmin] Edit Topic button clicked for topic:", topic);
                            setSelectedTopic(topic);
                            // logger.debug("[LearningPathAdmin] setSelectedTopic called with:", topic);
                            setIsEditingTopic(true);
                            // logger.debug("[LearningPathAdmin] setIsEditingTopic called with true.");
                          }}
                        >
                          Edit Topic
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            logger.debug("[LearningPathAdmin] Add Problem button clicked for topic:", topic);
                            setSelectedTopic(topic);
                            logger.debug("[LearningPathAdmin] setSelectedTopic called with:", topic);
                            const initialNewProblemState: NewProblem = {
                              name: "", content: "", difficulty: "EASY", required: false, reqOrder: 1,
                              problemType: "INFO", 
                              codeTemplate: "", testCases: [{ input: '', expected: '', isHidden: false }],
                              estimatedTime: undefined, collectionIds: [], slug: "",
                              language: "python", 
                              functionName: "", timeLimit: 5000, memoryLimit: undefined,
                              return_type: "", params: []
                            };
                            setNewProblem(initialNewProblemState);
                            logger.debug("[LearningPathAdmin] setNewProblem called with initial state:", initialNewProblemState);
                            setSupportedLanguages(JSON.parse(JSON.stringify(defaultSupportedLanguages)));
                            setDefaultLanguage('python'); 
                            logger.debug("[LearningPathAdmin] Language support states reset.");
                            setIsAddingProblem(true);
                            logger.debug("[LearningPathAdmin] setIsAddingProblem called with true.");
                          }}
                        >
                          Add Problem
                        </Button>
                        {/* NEW "Upload JSON to Topic" BUTTON */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                logger.debug("[LearningPathAdmin] Upload JSON to Topic button clicked for topic:", topic);
                                setCurrentTopicIdForJsonImport(topic.id);
                                setJsonInputForTopic("");
                                setJsonParseResultForTopic(null);
                                setIsUploadJsonToTopicDialogOpen(true);
                                logger.debug(`[LearningPathAdmin] Opening JSON import dialog for topicId: ${topic.id}`);
                            }}
                            title="Upload Problem via JSON to this Topic"
                        >
                            <FileJson className="mr-2 h-4 w-4" /> Upload JSON
                        </Button>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteTopic(topic.id)}
                        >
                            Delete
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        
                        // Add visual indicator for valid drop target
                        const target = e.currentTarget;
                        target.classList.add('border-dashed', 'border-2', 'border-primary', 'bg-primary/10');
                        
                        // Add pulsing animation for better visibility
                        if (!target.classList.contains('animate-pulse')) {
                          target.classList.add('animate-pulse');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        // Remove visual indicator when leaving drop zone
                        const target = e.currentTarget;
                        target.classList.remove('border-dashed', 'border-2', 'border-primary', 'bg-primary/10', 'animate-pulse');
                      }}
                      onDrop={(e) => {
                        // Ensure event doesn't propagate to parent elements
                        e.stopPropagation();
                        
                        // Remove visual indicator
                        const target = e.currentTarget;
                        target.classList.remove('border-dashed', 'border-2', 'border-primary', 'bg-primary/10', 'animate-pulse');
                        
                        handleDropOnTopic(e, topic.id);
                      }}
                      className={cn(
                        "transition-colors min-h-[100px]",
                        isDragging && "border-dashed border-2 border-muted-foreground/30 rounded-lg"
                      )}
                    >
                      <div className="space-y-2">
                        {topic.problems.map((problem, index) => (
                          <div 
                            key={problem.id} 
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              isDragging ? 'cursor-move' : ''
                            } ${
                              draggedProblem?.id === problem.id ? 'opacity-50' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, problem, index, topic.id)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={() => handleDragEnd(topic.id, topic.problems)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground cursor-move select-none" aria-label="Drag handle">
                                ⣿
                              </span>
                              <div>
                                <div className="font-medium">{problem.name}</div>
                                {problem.slug && (
                                  <div className="text-xs text-muted-foreground">
                                    Slug: {problem.slug}
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  <span className="inline-flex items-center">
                                    <Badge variant={problem.required ? "outline" : "secondary"} className="mr-2 w-[4.5rem] justify-center">
                                      {problem.required ? `REQ ${problem.reqOrder}` : `OPT ${problem.reqOrder}`}
                                    </Badge>
                                    {problem.difficulty} • {problem.problemType}
                                    {/* Display badges for both old enum collections and new dynamic collections */}
                                    <span className="ml-2 inline-flex items-center">
                                      {problem.collectionIds && problem.collectionIds.length > 0 && (
                                        problem.collectionIds.map((colId) => (
                                          <CollectionBadge 
                                            key={`collection-${colId}`} 
                                            collectionId={colId} 
                                            collectionsData={collections}
                                          />
                                        ))
                                      )}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewProblem(problem.id)}
                              >
                                View
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditProblemClick(problem)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteProblem(problem.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Problem Dialog - RESTORED TO FULL VERSION */}
      <Dialog open={isEditingProblem} onOpenChange={setIsEditingProblem}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>
              Modify the problem details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-problem-name"
                name="name"
                value={editProblemData?.name || ""}
                onChange={handleEditProblemInputChange}
              />
            </div>
            
            {/* Slug Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-slug">Slug <span className="text-destructive">*</span></Label>
              <Input
                id="edit-problem-slug"
                name="slug"
                value={editProblemData?.slug || ""}
                onChange={handleEditProblemInputChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A URL-friendly identifier for this problem. Used in problem URLs.
              </p>
            </div>
            
            {/* Content Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-content">Content (Markdown) <span className="text-destructive">*</span></Label>
              <Textarea
                id="edit-problem-content"
                name="content"
                value={editProblemData?.content || ""}
                onChange={handleEditProblemInputChange}
                className="min-h-[150px] max-h-[300px] overflow-y-auto"
              />
            </div>
            
            {/* Difficulty Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-difficulty">Difficulty <span className="text-destructive">*</span></Label>
              <Select 
                value={editProblemData?.difficulty} 
                onValueChange={(value: ProblemDifficultyOriginal) => handleEditProblemSelectChange('difficulty', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Problem Type Field (Cannot change) */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-type">Problem Type (Cannot change)</Label>
              <Input
                id="edit-problem-type"
                name="problemType" 
                value={editProblemData?.problemType || ""}
                disabled
              />
            </div>
            
            {/* Collections Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-collectionIds">Collections (Optional)</Label>
              <div className="space-y-2 border rounded-md p-3">
                {loadingCollections ? (
                  <div className="py-2 text-center text-muted-foreground">Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className="py-2 text-center text-muted-foreground">No collections found</div>
                ) : (
                  collections.map(collection => (
                    <div key={collection.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-collection-${collection.id}`}
                        checked={editProblemData?.collectionIds?.includes(collection.id) || false}
                        onCheckedChange={(checked) => {
                          if (!editProblemData) return;
                          const currentIds = editProblemData.collectionIds || [];
                          const newIds = checked
                            ? [...currentIds, collection.id]
                            : currentIds.filter(id => id !== collection.id);
                          handleEditProblemSelectChange('collectionIds', newIds);
                        }}
                      />
                      <Label htmlFor={`edit-collection-${collection.id}`}>{collection.name}</Label>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* CODING Specific Fields - Conditionally Rendered */}
            {editProblemData?.problemType === 'CODING' && editProblemData?.codeProblem && (
              <>
                {/* Programming Language Select (part of codeProblem in state) */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-code-language">Programming Language <span className="text-destructive">*</span></Label>
                  <Select 
                    value={editProblemData.codeProblem.language || defaultLanguage} 
                    onValueChange={(value: string) => handleEditProblemSelectChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Language Support Component */}
                <div className="grid gap-2">
                  <Label>Language Support <span className="text-destructive">*</span></Label>
                  <LanguageSupport
                    supportedLanguages={supportedLanguages}
                    setSupportedLanguages={setSupportedLanguages}
                    defaultLanguage={defaultLanguage} /* This should be the one tied to the form's state */
                    setDefaultLanguage={setDefaultLanguage} /* This should update the form's state */
                  />
                </div>
                
                {/* Function Name */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-function-name">Function Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-function-name"
                    name="functionName" /* This should target editProblemData.codeProblem.functionName */
                    value={editProblemData.codeProblem.functionName || ""}
                    onChange={handleEditProblemCodeProblemChange} // This handler updates codeProblem fields
                    placeholder="e.g., solveProblem"
                  />
                </div>
                 {/* Return Type Field */}
                <div className="grid gap-2">
                    <Label htmlFor="edit-return-type">Return Type</Label>
                    <Input
                        id="edit-return-type"
                        name="return_type" // This should target editProblemData.codeProblem.return_type
                        value={editProblemData.codeProblem.return_type || ""}
                        onChange={handleEditProblemCodeProblemChange}
                        placeholder="e.g., int[], String, void"
                  />
                </div>
                
                {/* Time Limit & Memory Limit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-time-limit">Time Limit (ms) <span className="text-destructive">*</span></Label>
                    <Input
                      id="edit-time-limit"
                      name="timeLimit" // Targets codeProblem.timeLimit
                      type="number"
                      value={editProblemData.codeProblem.timeLimit || 5000}
                      onChange={handleEditProblemCodeProblemChange}
                      min={1000}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-memory-limit">Memory Limit (MB)</Label>
                    <Input
                      id="edit-memory-limit"
                      name="memoryLimit" // Targets codeProblem.memoryLimit
                      type="number"
                      value={editProblemData.codeProblem.memoryLimit || ''} 
                      onChange={handleEditProblemCodeProblemChange}
                      min={1}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                
                {/* Function Parameters Section */}
                <div className="grid gap-2">
                  <Label>Function Parameters</Label>
                  <div className="space-y-4 border rounded-md p-4">
                    {editProblemData.codeProblem.params?.map((param, index) => (
                      <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Parameter {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                            onClick={() => {
                                const newParams = [...(editProblemData.codeProblem?.params || [])];
                                newParams.splice(index, 1);
                                setEditProblemData(prev => prev ? {...prev, codeProblem: prev.codeProblem ? {...prev.codeProblem, params: newParams} : undefined} : null);
                            }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`edit-param-name-${index}`} className="text-xs">Name <span className="text-destructive">*</span></Label>
                            <Input
                              id={`edit-param-name-${index}`}
                              value={param.name}
                              onChange={(e) => {
                                const newParams = [...(editProblemData.codeProblem?.params || [])];
                                newParams[index] = {...newParams[index], name: e.target.value};
                                setEditProblemData(prev => prev ? {...prev, codeProblem: prev.codeProblem ? {...prev.codeProblem, params: newParams} : undefined} : null);
                              }}
                              placeholder="Parameter name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-param-type-${index}`} className="text-xs">Type <span className="text-destructive">*</span></Label>
                            <Input
                              id={`edit-param-type-${index}`}
                              value={param.type}
                              onChange={(e) => {
                                const newParams = [...(editProblemData.codeProblem?.params || [])];
                                newParams[index] = {...newParams[index], type: e.target.value};
                                setEditProblemData(prev => prev ? {...prev, codeProblem: prev.codeProblem ? {...prev.codeProblem, params: newParams} : undefined} : null);
                              }}
                              placeholder="Parameter type"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-param-desc-${index}`} className="text-xs">Description (optional)</Label>
                          <Input
                            id={`edit-param-desc-${index}`}
                            value={param.description || ''}
                            onChange={(e) => {
                                const newParams = [...(editProblemData.codeProblem?.params || [])];
                                newParams[index] = {...newParams[index], description: e.target.value};
                                setEditProblemData(prev => prev ? {...prev, codeProblem: prev.codeProblem ? {...prev.codeProblem, params: newParams} : undefined} : null);
                            }}
                            placeholder="Parameter description"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newParams = [...(editProblemData.codeProblem?.params || []), {name: '', type: '', description: ''}];
                        setEditProblemData(prev => prev ? {...prev, codeProblem: prev.codeProblem ? {...prev.codeProblem, params: newParams} : undefined} : null);
                      }}
                      className="w-full"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Parameter
                    </Button>
                  </div>
                </div>
                
                {/* Test Cases Section */}
                <div className="grid gap-2">
                  <Label>Test Cases <span className="text-destructive">*</span></Label>
                  <div className="space-y-4 border rounded-md p-4 max-h-[400px] overflow-y-auto">
                    {editProblemData.codeProblem.testCases?.map((testCase, index) => (
                      <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                            onClick={() => handleRemoveEditTestCase(index)} // Uses existing handler
                            disabled={(editProblemData.codeProblem?.testCases?.length || 0) <= 1}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`edit-test-input-${index}`} className="text-xs">Input <span className="text-destructive">*</span></Label>
                            <Textarea
                                id={`edit-test-input-${index}`}
                              value={testCase.input}
                              onChange={(e) => handleEditTestCaseChange(index, 'input', e.target.value)} // Uses existing handler
                              placeholder="Test input"
                              className="font-mono text-sm"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-test-output-${index}`} className="text-xs">Expected Output <span className="text-destructive">*</span></Label>
                            <Textarea
                                id={`edit-test-output-${index}`}
                              value={testCase.expected} // This should be testCase.expected
                              onChange={(e) => handleEditTestCaseChange(index, 'expected', e.target.value)} // Uses existing handler
                              placeholder="Expected output"
                              className="font-mono text-sm"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                              id={`edit-test-hidden-${index}`}
                            checked={testCase.isHidden}
                            onCheckedChange={(checked) => handleEditTestCaseChange(index, 'isHidden', !!checked)} // Uses existing handler
                            />
                          <Label htmlFor={`edit-test-hidden-${index}`} className="text-sm">Hidden test case</Label>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddEditTestCase} // Uses existing handler
                      className="w-full"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Test Case
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {/* Req Order Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-reqOrder">Order (if required)</Label>
              <Input
                id="edit-problem-reqOrder"
                name="reqOrder"
                type="number"
                value={editProblemData?.reqOrder || ''}
                onChange={handleEditProblemInputChange}
                min={1}
              />
            </div>
            
            {/* Estimated Time Field */}
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-estimatedTime">Estimated Time (minutes)</Label>
              <Input
                id="edit-problem-estimatedTime"
                name="estimatedTime"
                type="number"
                value={editProblemData?.estimatedTime || ''}
                onChange={handleEditProblemInputChange}
                min={1}
                placeholder="Leave empty for no estimate"
              />
            </div>
            
            {/* Required Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-problem-required"
                name="required" // This needs to be handled by handleEditProblemCheckboxChange or similar
                checked={editProblemData?.required || false}
                onCheckedChange={(checked) => handleEditProblemSelectChange('required', !!checked)} // Use select change for boolean
              />
              <Label htmlFor="edit-problem-required">Required</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProblem(false)}>Cancel</Button>
            <Button onClick={handleEditProblem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={isEditingTopic} onOpenChange={setIsEditingTopic}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          {/* REMOVE FAULTY LOGGER: {isEditingTopic && logger.debug("[LearningPathAdmin] Rendering Edit Topic Dialog. Selected topic:", selectedTopic)} */}
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Modify the topic details.
            </DialogDescription>
          </DialogHeader>
          {/* Assuming the form fields for editing a topic are here, correctly using selectedTopic */}
          {/* For example: */}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-name">Name</Label>
              <Input
                id="edit-topic-name"
                name="name"
                value={selectedTopic?.name || ""}
                onChange={handleTopicChange} // Ensure handleTopicChange is correctly defined and updates selectedTopic
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-slug">Slug</Label>
              <Input
                id="edit-topic-slug"
                name="slug"
                value={selectedTopic?.slug || ""}
                onChange={handleTopicChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-description">Description</Label>
              <Textarea
                id="edit-topic-description"
                name="description"
                value={selectedTopic?.description || ""}
                onChange={handleTopicChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-content">Content</Label>
              <Textarea
                id="edit-topic-content"
                name="content"
                value={selectedTopic?.content || ""}
                onChange={handleTopicChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-order">Order</Label>
              <Input
                id="edit-topic-order"
                name="order"
                type="number"
                value={selectedTopic?.order || 0}
                onChange={handleTopicChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingTopic(false)}>Cancel</Button>
            <Button onClick={handleEditTopic}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog - Ensure this is the complete structure */}
      <Dialog open={isAddingTopic} onOpenChange={setIsAddingTopic}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Add Topic to {selectedLevel?.name || 'Level'}</DialogTitle>
            <DialogDescription>
              Create a new topic for the selected level.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-topic-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="add-topic-name"
                value={newTopic.name}
                onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                placeholder="Topic name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-topic-slug">Slug (Optional)</Label>
              <Input
                id="add-topic-slug"
                value={newTopic.slug || ''}
                onChange={(e) => setNewTopic({ ...newTopic, slug: e.target.value })}
                placeholder="URL-friendly identifier (auto-generated if blank)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-topic-description">Description</Label>
              <Textarea
                id="add-topic-description"
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="A brief description for this topic."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-topic-content">Content (Markdown)</Label>
              <Textarea
                id="add-topic-content"
                value={newTopic.content}
                onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                placeholder="Detailed content for the topic (Markdown supported)."
                className="min-h-[150px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-topic-order">Order <span className="text-destructive">*</span></Label>
              <Input
                id="add-topic-order"
                type="number"
                value={newTopic.order}
                onChange={(e) => setNewTopic({ ...newTopic, order: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingTopic(false)}>Cancel</Button>
            <Button onClick={handleAddTopic}>Add Topic</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Level Dialog - Ensure this is the complete structure */}
      <Dialog open={isEditingLevel} onOpenChange={setIsEditingLevel}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Edit Level: {selectedLevel?.name || ''}</DialogTitle>
            <DialogDescription>
              Modify the details of this level.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-level-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-level-name"
                name="name" // Ensure handleLevelChange or direct setter uses this
                value={selectedLevel?.name || ""}
                onChange={handleLevelChange} // Or (e) => setSelectedLevel(prev => prev ? {...prev, name: e.target.value} : null)
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level-description">Description</Label>
              <Textarea
                id="edit-level-description"
                name="description" // Ensure handleLevelChange or direct setter uses this
                value={selectedLevel?.description || ""}
                onChange={handleLevelChange} // Or (e) => setSelectedLevel(prev => prev ? {...prev, description: e.target.value} : null)
                placeholder="Describe this level..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level-order">Order <span className="text-destructive">*</span></Label>
              <Input
                id="edit-level-order"
                name="order" // Ensure handleLevelChange or direct setter uses this
                type="number"
                value={selectedLevel?.order || 1} // Default to 1 if undefined
                onChange={handleLevelChange} // Or (e) => setSelectedLevel(prev => prev ? {...prev, order: parseInt(e.target.value) || 1} : null)
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingLevel(false)}>Cancel</Button>
            <Button onClick={handleEditLevel}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Problem Dialog - Ensure this is the complete structure */}
      <Dialog open={isAddingProblem} onOpenChange={setIsAddingProblem}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Add New Problem to {selectedTopic?.name || 'Topic'}</DialogTitle>
            <DialogDescription>
              Create a new problem for the selected topic.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Fields: Name, Slug, Content, Difficulty, Problem Type, Collections */}
            <div className="grid gap-2">
              <Label htmlFor="add-problem-name">Name <span className="text-destructive">*</span></Label>
              <Input id="add-problem-name" name="name" value={newProblem.name} onChange={handleProblemChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-problem-slug">Slug (Optional)</Label>
              <Input id="add-problem-slug" name="slug" value={newProblem.slug || ''} onChange={handleProblemChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-problem-content">Content (Markdown) <span className="text-destructive">*</span></Label>
              <Textarea id="add-problem-content" name="content" value={newProblem.content} onChange={handleProblemChange} className="min-h-[150px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-problem-difficulty">Difficulty</Label>
                <Select name="difficulty" value={newProblem.difficulty} onValueChange={(value) => setNewProblem(prev => ({ ...prev, difficulty: value as ProblemDifficultyOriginal }))}>
                  <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="add-problem-problemType">Problem Type</Label>
                <Select name="problemType" value={newProblem.problemType} onValueChange={handleProblemTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Select problem type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="CODING">Coding</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-problem-collectionIds">Collections (Optional)</Label>
              <div className="space-y-2 border rounded-md p-3 max-h-[150px] overflow-y-auto">
                {loadingCollections ? <p>Loading collections...</p> : collections.map(collection => (
                    <div key={collection.id} className="flex items-center gap-2">
                      <Checkbox
                      id={`add-problem-collection-${collection.id}`}
                      checked={newProblem.collectionIds?.includes(collection.id) || false}
                        onCheckedChange={(checked) => {
                        const currentIds = newProblem.collectionIds || [];
                        const newIds = checked ? [...currentIds, collection.id] : currentIds.filter(id => id !== collection.id);
                        setNewProblem(prev => ({ ...prev, collectionIds: newIds }));
                      }}
                    />
                    <Label htmlFor={`add-problem-collection-${collection.id}`} className="font-normal">{collection.name}</Label>
                    </div>
                ))}
                {collections.length === 0 && !loadingCollections && <p className="text-sm text-muted-foreground">No collections available.</p>}
              </div>
            </div>
            
            {/* CODING Specific Fields - Conditionally Rendered */}
            {newProblem.problemType === 'CODING' && (
              <>
                <h4 className="text-lg font-semibold mt-3 border-t pt-3">Coding Details</h4>
                {/* Language Support Component */}
                <div className="grid gap-2">
                  <Label>Language Support <span className="text-destructive">*</span></Label>
                  <LanguageSupport
                    supportedLanguages={supportedLanguages}
                    setSupportedLanguages={setSupportedLanguages}
                    defaultLanguage={defaultLanguage}
                    setDefaultLanguage={setDefaultLanguage}
                  />
                </div>
                
                {/* Function Name */}
                <div className="grid gap-2">
                  <Label htmlFor="add-problem-functionName">Function Name <span className="text-destructive">*</span></Label>
                  <Input id="add-problem-functionName" name="functionName" value={newProblem.functionName} onChange={handleProblemChange} placeholder="e.g., solveProblem" />
                </div>
                
                {/* Return Type */}
                <div className="grid gap-2">
                  <Label htmlFor="add-problem-return_type">Return Type <span className="text-destructive">*</span></Label>
                  <Input id="add-problem-return_type" name="return_type" value={newProblem.return_type || ''} onChange={handleProblemChange} placeholder="e.g., int[], String, void" />
                </div>

                {/* Time Limit & Memory Limit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="add-problem-timeLimit">Time Limit (ms) <span className="text-destructive">*</span></Label>
                    <Input id="add-problem-timeLimit" name="timeLimit" type="number" value={newProblem.timeLimit} onChange={handleProblemChange} min={1000} />
                  </div>
                  <div>
                    <Label htmlFor="add-problem-memoryLimit">Memory Limit (MB)</Label>
                    <Input id="add-problem-memoryLimit" name="memoryLimit" type="number" value={newProblem.memoryLimit || ''} onChange={handleProblemChange} min={1} placeholder="Optional" />
                  </div>
                </div>
                
                {/* Function Parameters Section */}
                <div className="grid gap-2">
                  <Label>Function Parameters</Label>
                  <div className="space-y-4 border rounded-md p-3">
                    {newProblem.params?.map((param, index) => (
                      <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Parameter {index + 1}</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveParam(index)}><Trash className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`add-param-name-${index}`} className="text-xs">Name <span className="text-destructive">*</span></Label>
                            <Input id={`add-param-name-${index}`} value={param.name} onChange={(e) => handleParamChange(index, 'name', e.target.value)} placeholder="Parameter name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`add-param-type-${index}`} className="text-xs">Type <span className="text-destructive">*</span></Label>
                            <Input id={`add-param-type-${index}`} value={param.type} onChange={(e) => handleParamChange(index, 'type', e.target.value)} placeholder="Parameter type" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`add-param-desc-${index}`} className="text-xs">Description (optional)</Label>
                          <Input id={`add-param-desc-${index}`} value={param.description || ''} onChange={(e) => handleParamChange(index, 'description', e.target.value)} placeholder="Parameter description" />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddParam} className="w-full"><PlusCircle className="h-4 w-4 mr-2" /> Add Parameter</Button>
                  </div>
                </div>
                
                {/* Test Cases Section */}
                <div className="grid gap-2">
                  <Label>Test Cases <span className="text-destructive">*</span></Label>
                  <div className="space-y-4 border rounded-md p-4 max-h-[300px] overflow-y-auto">
                    {newProblem.testCases.map((testCase, index) => (
                        <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                          {newProblem.testCases.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                                const newTestCases = [...newProblem.testCases]; newTestCases.splice(index, 1);
                                setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                            }}><Trash className="h-4 w-4" /></Button>
                          )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor={`add-test-input-${index}`} className="text-xs">Input <span className="text-destructive">*</span></Label>
                            <Textarea id={`add-test-input-${index}`} value={testCase.input} onChange={(e) => {
                                const newTestCases = [...newProblem.testCases]; newTestCases[index].input = e.target.value;
                                setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                            }} placeholder="Test input (JSON format if complex)" className="font-mono text-sm" required />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor={`add-test-output-${index}`} className="text-xs">Expected Output <span className="text-destructive">*</span></Label>
                            <Textarea id={`add-test-output-${index}`} value={testCase.expected} onChange={(e) => {
                                const newTestCases = [...newProblem.testCases]; newTestCases[index].expected = e.target.value;
                                setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                            }} placeholder="Expected output (JSON format if complex)" className="font-mono text-sm" required />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                          <Checkbox id={`add-test-hidden-${index}`} checked={testCase.isHidden} onCheckedChange={(checked) => {
                              const newTestCases = [...newProblem.testCases]; newTestCases[index].isHidden = !!checked;
                              setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                          }} />
                          <Label htmlFor={`add-test-hidden-${index}`} className="text-sm">Hidden test case</Label>
                          </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewProblem(prev => ({ ...prev, testCases: [...prev.testCases, { input: '', expected: '', isHidden: false }] }))} className="w-full"><PlusCircle className="h-4 w-4 mr-2" /> Add Test Case</Button>
                  </div>
                </div>
              </>
            )}
            {/* Req Order, Estimated Time, Required Checkbox */}
            <div className="grid gap-2">
              <Label htmlFor="add-problem-reqOrder">Order (within topic, if required)</Label>
              <Input id="add-problem-reqOrder" name="reqOrder" type="number" value={newProblem.reqOrder} onChange={handleProblemChange} min={1} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-problem-estimatedTime">Estimated Time (minutes)</Label>
              <Input id="add-problem-estimatedTime" name="estimatedTime" type="number" value={newProblem.estimatedTime || ''} onChange={(e) => setNewProblem(prev => ({...prev, estimatedTime: e.target.value ? parseInt(e.target.value) : undefined}))} min={1} placeholder="Optional" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="add-problem-required" name="required" checked={newProblem.required} onCheckedChange={(checked) => setNewProblem(prev => ({ ...prev, required: !!checked }))} />
              <Label htmlFor="add-problem-required">Required in topic</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingProblem(false)}>Cancel</Button>
            <Button onClick={handleAddProblem}>Add Problem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW Dialog for Uploading JSON to a specific Topic */}
      <Dialog open={isUploadJsonToTopicDialogOpen} onOpenChange={(isOpen) => {
          setIsUploadJsonToTopicDialogOpen(isOpen);
          if (!isOpen) {
              setJsonInputForTopic("");
              setJsonParseResultForTopic(null);
              setCurrentTopicIdForJsonImport(null);
          }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>
                    Upload JSON to Topic: {levels.flatMap(l => l.topics).find(t => t.id === currentTopicIdForJsonImport)?.name || 'Selected Topic'}
                </DialogTitle>
                <DialogDescription>
                    Paste problem JSON. The problem will be associated with this topic. You can also specify collection IDs in the JSON.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto py-4 space-y-4">
                <Textarea
                    placeholder='{
  "name": "My New Problem for this Topic",
  "content": "Problem description...",
  ...
}'
                    value={jsonInputForTopic}
                    onChange={(e) => setJsonInputForTopic(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                />
                {jsonParseResultForTopic && !jsonParseResultForTopic.isValid && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs">
                        <h4 className="font-semibold mb-1">Validation Errors:</h4>
                        <ul className="list-disc list-inside">
                        {jsonParseResultForTopic.errors.map((err, idx) => (
                            <li key={idx}>{err.path.join('.')} - {err.message}</li>
                        ))}
                        </ul>
            </div>
                )}
                {jsonParseResultForTopic && jsonParseResultForTopic.warnings && jsonParseResultForTopic.warnings.length > 0 && (
                    <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-700 text-xs">
                        <h4 className="font-semibold mb-1">Warnings:</h4>
                        <ul className="list-disc list-inside">
                        {jsonParseResultForTopic.warnings.map((warn, idx) => (
                            <li key={idx}>{warn}</li>
                        ))}
                        </ul>
          </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => {
                    setIsUploadJsonToTopicDialogOpen(false);
                    setJsonInputForTopic("");
                    setJsonParseResultForTopic(null);
                    setCurrentTopicIdForJsonImport(null);
                }}>Cancel</Button>
                <Button onClick={async () => {
                    if (!currentTopicIdForJsonImport) {
                        toast.error("No topic selected for JSON import. This should not happen.");
                        return;
                    }
                    const validationRes = validateAndParseProblemJSON(jsonInputForTopic); // Validate first
                    setJsonParseResultForTopic(validationRes);
                    if (!validationRes.isValid) {
                        toast.error("JSON validation failed.");
                        return;
                    }
                    try {
                        await problemCollectionAdminRef.current?.handleJsonImport(
                            jsonInputForTopic, 
                            { defaultTopicId: currentTopicIdForJsonImport }
                        );
                        // On success from the shared handler
                        toast.success("Problem successfully imported to topic!");
                        setIsUploadJsonToTopicDialogOpen(false);
                        setJsonInputForTopic("");
                        setJsonParseResultForTopic(null);
                        setCurrentTopicIdForJsonImport(null);
                        refresh(); // Refresh LearningPathAdmin to show the new problem in the topic
                    } catch (apiError) {
                        // Error is already toasted by the shared handleJsonImport
                        // Update local parse result to show API error if JSON itself was valid
                        setJsonParseResultForTopic({
                            isValid: false,
                            errors: [{path: ['api'], message: (apiError as Error).message || 'API submission failed after JSON validation.'}],
                            warnings: validationRes.warnings || [],
                            parsedData: validationRes.parsedData
                        });
                    }
                }}>Parse & Add Problem</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Dialog for Topic */}
      <Dialog open={isUploadJsonToTopicDialogOpen} onOpenChange={(isOpen) => {
        setIsUploadJsonToTopicDialogOpen(isOpen);
        if (!isOpen) {
          setJsonInputForTopic("");
          setJsonParseResultForTopic(null);
          setCurrentTopicIdForJsonImport(null); // Reset current topic ID on close
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Problem via JSON to Topic</DialogTitle>
            <DialogDescription>
              {currentTopicIdForJsonImport 
                ? `Importing to topic: ${levels.flatMap(l => l.topics).find(t => t.id === currentTopicIdForJsonImport)?.name || 'Selected Topic'}. JSON content can override topicId, but this topic will be the default.`
                : "Select a topic first or ensure topicId is in JSON."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-4 pr-2">
            <Textarea
              placeholder='Paste ProblemJSONImport compliant JSON here...\n{\n  "name": "My New Problem from JSON",\n  "content": "Problem description...",\n  "difficulty": "EASY",\n  "problemType": "CODING",\n  "required": false,\n  "reqOrder": 1,\n  /* "topicId": "optional_topic_id_if_different_from_current", */\n  "collectionIds": ["collection_id_1"],\n  "coding": {\n    "languages": {\n      "defaultLanguage": "python",\n      "supported": {\n        "python": { "template": "def solve():\n  pass" },\n        "javascript": { "template": "function solve() {\n  \n}" }\n      }\n    },\n    "functionName": "solve",\n    "returnType": "int",\n    "parameters": [{ "name": "arg1", "type": "string" }],\n    "testCases": [{ "input": "[\"hello\"]", "expectedOutput": "1", "isHidden": false }]\n  }\n}'
              value={jsonInputForTopic}
              onChange={(e) => setJsonInputForTopic(e.target.value)}
              className="min-h-[300px] font-mono text-sm w-full"
            />
            {jsonParseResultForTopic && !jsonParseResultForTopic.isValid && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs">
                <h4 className="font-semibold mb-1">Validation Errors:</h4>
                <ul className="list-disc list-inside pl-4">
                  {jsonParseResultForTopic.errors.map((err, idx) => (
                    <li key={idx}>{err.path.join('.')} - {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {jsonParseResultForTopic && jsonParseResultForTopic.warnings && jsonParseResultForTopic.warnings.length > 0 && (
              <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-700 text-xs">
                <h4 className="font-semibold mb-1">Warnings:</h4>
                <ul className="list-disc list-inside pl-4">
                  {jsonParseResultForTopic.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadJsonToTopicDialogOpen(false);
              setJsonInputForTopic("");
              setJsonParseResultForTopic(null);
              setCurrentTopicIdForJsonImport(null);
            }}>Cancel</Button>
            <Button 
              onClick={async () => {
                if (currentTopicIdForJsonImport) {
                  await handleParseAndAddProblemFromJSONToTopic(jsonInputForTopic, currentTopicIdForJsonImport);
                } else {
                  toast.error("Cannot add problem: Target Topic ID is not set.");
                }
              }}
              disabled={!jsonInputForTopic.trim() || (jsonParseResultForTopic?.isValid === false)}
            >
              Parse & Add Problem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 