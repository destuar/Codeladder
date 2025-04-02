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
import { useState, useEffect, useRef, useCallback } from "react";
import { ProblemCollectionAdmin } from "./ProblemCollectionAdmin";
import { Trash, PlusCircle, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProblemDifficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
type ProblemType = 'INFO' | 'CODING';

type NewLevel = {
  name: string;
  description: string;
  order: number;
};

type NewTopic = {
  name: string;
  description: string;
  content: string;
  order: number;
  slug?: string;
};

type TestCase = {
  input: string;
  expected: string;
  isHidden: boolean;
};

type NewProblem = {
  name: string;
  content: string;
  difficulty: ProblemDifficulty;
  required: boolean;
  reqOrder: number;
  problemType: ProblemType;
  codeTemplate: string;
  testCases: TestCase[];
  estimatedTime?: number;
  collectionIds: string[];
  slug?: string;
  language: string;
  functionName: string;
  timeLimit: number;
  memoryLimit?: number;
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
type EditProblemData = Omit<Problem, 'topic'> & { // Exclude topic from edit form data
  topicId: string | null; // Store topic ID separately
  codeProblem?: { // Make codeProblem optional initially
    language: string;
    codeTemplate: string | null;
    functionName: string | null;
    timeLimit: number;
    memoryLimit: number | null;
    testCases: TestCase[];
  } | null;
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
    difficulty: "EASY_I",
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
    memoryLimit: undefined
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

  // Listen for problem removal events from the ProblemCollectionAdmin component
  useEffect(() => {
    const handleProblemRemovedFromTopic = (event: ProblemRemovedFromTopicEvent) => {
      const { problemId, topicId } = event.detail;
      console.log(`Received event: Problem ${problemId} removed from topic ${topicId}`);
      
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
      console.error(`Error fetching problem ${problemId}:`, error);
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
        console.error("Error fetching collections:", error);
      } finally {
        setLoadingCollections(false);
      }
    };
    
    fetchCollections();
  }, [token]);

  const handleAddLevel = async () => {
    try {
      console.log('Adding new level:', newLevel);
      await api.post("/learning/levels", newLevel, token);
      setIsAddingLevel(false);
      setNewLevel({ name: "", description: "", order: 1 });
      toast.success("Level added successfully");
      refresh();
    } catch (err) {
      console.error("Error adding level:", err);
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
      console.error("Error updating level:", err);
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
      console.error("Error adding topic:", err);
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
      console.error("Error updating topic:", err);
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
      // Create problem with necessary data
      const problemData = {
        name: newProblem.name,
        content: newProblem.content,
        difficulty: newProblem.difficulty,
        required: newProblem.required,
        reqOrder: newProblem.reqOrder,
        problemType: newProblem.problemType,
        topicId: selectedTopic.id,
        collectionIds: newProblem.collectionIds,
        slug: newProblem.slug,
        ...(newProblem.problemType === 'CODING' ? {
          codeTemplate: newProblem.codeTemplate,
          testCases: JSON.stringify(newProblem.testCases),
          language: newProblem.language,
          functionName: newProblem.functionName,
          timeLimit: Number(newProblem.timeLimit),
          memoryLimit: newProblem.memoryLimit ? Number(newProblem.memoryLimit) : undefined
        } : {}),
        ...(newProblem.estimatedTime ? { estimatedTime: newProblem.estimatedTime } : {})
      };
      
      await api.post("/problems", problemData, token);
      setIsAddingProblem(false);
      
      // Reset form state
      setNewProblem({
        name: "",
        content: "",
        difficulty: "EASY_I",
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
        memoryLimit: undefined
      });
      
      toast.success("Problem added successfully");
      refresh();
    } catch (err) {
      console.error("Error adding problem:", err);
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
    setEditProblemData(prev => {
      if (!prev) return null;
      // Handle nested codeProblem fields
      if (name === 'language' || name === 'timeLimit' || name === 'memoryLimit') {
        return {
          ...prev,
          codeProblem: {
            ...(prev.codeProblem || { // Initialize codeProblem if null
              language: 'javascript',
              codeTemplate: null,
              functionName: null,
              timeLimit: 5000,
              memoryLimit: null,
              testCases: [],
            }),
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
      return {
        ...prev,
        codeProblem: {
          ...(prev.codeProblem || { // Initialize codeProblem if null
            language: 'javascript',
            codeTemplate: null,
            functionName: null,
            timeLimit: 5000,
            memoryLimit: null,
            testCases: [],
          }),
          [name]: value,
        },
      };
    });
  }, []);

  const handleEditTestCaseChange = useCallback((index: number, field: keyof TestCase, value: string | boolean) => {
    setEditProblemData(prev => {
      if (!prev || !prev.codeProblem) return prev;
      const newTestCases = [...prev.codeProblem.testCases];
      if (newTestCases[index]) {
        (newTestCases[index] as any)[field] = value;
      }
      return { 
        ...prev, 
        codeProblem: { 
          ...prev.codeProblem, 
          testCases: newTestCases 
        } 
      };
    });
  }, []);

  const handleAddEditTestCase = useCallback(() => {
    setEditProblemData(prev => {
      if (!prev || !prev.codeProblem) return prev;
      return {
        ...prev,
        codeProblem: {
          ...prev.codeProblem,
          testCases: [
            ...prev.codeProblem.testCases,
            { input: '', expected: '', isHidden: false }
          ]
        }
      };
    });
  }, []);

  const handleRemoveEditTestCase = useCallback((index: number) => {
    setEditProblemData(prev => {
      if (!prev || !prev.codeProblem || prev.codeProblem.testCases.length <= 1) return prev;
      const newTestCases = prev.codeProblem.testCases.filter((_, i) => i !== index);
      return {
        ...prev,
        codeProblem: { ...prev.codeProblem, testCases: newTestCases }
      };
    });
  }, []);
  // ***

  const handleEditProblem = async () => {
    // *** MODIFIED to use editProblemData ***
    if (!editProblemData) {
      toast.error("No problem data to save.");
      return;
    }

    try {
      invalidateProblemCache(editProblemData.id);
      
      const problemPayload: any = {
        name: editProblemData.name,
        content: editProblemData.content || "", // Ensure content is string
        difficulty: editProblemData.difficulty,
        required: editProblemData.required,
        problemType: editProblemData.problemType,
        slug: editProblemData.slug || "",
        estimatedTime: editProblemData.estimatedTime || null,
        collectionIds: editProblemData.collectionIds || [],
        // Conditionally include coding fields
        ...(editProblemData.problemType === 'CODING' && editProblemData.codeProblem ? {
          codeTemplate: editProblemData.codeProblem.codeTemplate,
          // Ensure testCases is stringified, handle potential null/empty case
          testCases: JSON.stringify(editProblemData.codeProblem.testCases || []),
          language: editProblemData.codeProblem.language,
          functionName: editProblemData.codeProblem.functionName,
          timeLimit: editProblemData.codeProblem.timeLimit,
          memoryLimit: editProblemData.codeProblem.memoryLimit,
        } : {
          // Explicitly null out coding fields if type is not CODING
          codeTemplate: null,
          testCases: null,
          language: null,
          functionName: null,
          timeLimit: null,
          memoryLimit: null,
        })
      };

      // Handle topic change separately (if logic is needed)
      const currentTopicId = selectedProblem?.topic?.id || null; // Get original topic ID from selectedProblem
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
          problemPayload.reqOrder = editProblemData.reqOrder;
          await api.put(`/problems/${editProblemData.id}`, problemPayload, token);
          toast.success("Problem updated successfully");
      }

      setIsEditingProblem(false);
      setEditProblemData(null); // Clear edit form state
      setSelectedProblem(null); // Clear selection
      refresh(); // Refresh learning path data
    } catch (err) {
      console.error("Error updating problem:", err);
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
        memoryLimit: undefined
      } : {})
    }));
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await api.delete(`/learning/topics/${topicId}`, token);
      toast.success("Topic deleted successfully");
      refresh();
    } catch (err) {
      console.error("Error deleting topic:", err);
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
      console.error("Error deleting problem:", err);
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
    const updatedValue = name === 'reqOrder' ? (value === '' ? 1 : Math.max(1, parseInt(value) || 1)) : value;
    setSelectedProblem(prev => prev ? updateProblem(prev, { [name]: updatedValue }) : null);
  };

  // Add helper function to add problems to a specific collection
  const addProblemToCollection = async (problemId: string, collectionId: string) => {
    try {
      await api.post(`/admin/collections/${collectionId}/problems`, { problemId }, token);
      toast.success("Problem added to collection");
      return true;
    } catch (err) {
      console.error("Error adding problem to collection:", err);
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
        console.log('Ghost element already removed');
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
        console.log("No drag data found");
        return;
      }
      
      const dragData = JSON.parse(dragDataString);
      console.log("Processing drop on topic with data:", dragData);
      
      // Only handle problem drags
      if (dragData.type !== 'problem') return;
      
      // We will need this problem's full data, get it from cache if possible
      let problem;
      try {
        problem = await getProblem(dragData.problemId);
        // Immediately invalidate the cache as we'll be modifying this problem
        invalidateProblemCache(dragData.problemId);
      } catch (err) {
        console.error("Error getting problem data for drop:", err);
        toast.error("Failed to process drag - could not get problem data");
        return;
      }
      
      if (dragData.sourceType === 'topic') {
        // Skip if source and target topics are the same
        if (dragData.sourceId === targetTopicId) {
          console.log("Same topic, skipping API call");
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
          console.error("Error moving problem between topics:", err);
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
              console.log("Removed problem from previous topic");
            } catch (removeError) {
              console.error("Error removing from previous topic:", removeError);
              // Try fallback method
              try {
                await api.put(`/problems/${problem.id}/remove-topic`, {}, token);
                console.log("Removed problem from previous topic (fallback method)");
              } catch (fallbackError) {
                console.error("Failed with fallback method too:", fallbackError);
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
          console.error("Error adding collection problem to topic:", err);
          toast.error("Failed to add problem to topic");
        }
      }
      
    } catch (error) {
      console.error("Error handling drop on topic:", error);
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
      console.error('Error reordering problems:', err);
      toast.error('Failed to reorder problems');
      refresh(); // Only refresh on error to get back to the server state
    }
    
    setDraggedProblem(null);
  };

  // Update the click handler to set the NEW editProblemData state
  const handleEditProblemClick = (problem: Problem) => {
    setIsLoadingProblems(true); // Use a loading state for fetching
    api.get(`/problems/${problem.id}`, token)
      .then(problemDetails => {
        // Initialize editProblemData state
        setEditProblemData({
          ...problemDetails,
          topicId: problemDetails.topic?.id || null,
          // Explicitly handle codeProblem structure
          codeProblem: problemDetails.codeProblem ? {
            language: problemDetails.codeProblem.language || 'javascript',
            codeTemplate: problemDetails.codeProblem.codeTemplate || null,
            functionName: problemDetails.codeProblem.functionName || null,
            timeLimit: problemDetails.codeProblem.timeLimit || 5000,
            memoryLimit: problemDetails.codeProblem.memoryLimit || null,
            testCases: (Array.isArray(problemDetails.codeProblem.testCases) ? problemDetails.codeProblem.testCases : []).map((tc: any) => ({ 
              input: tc.input || '', 
              expected: tc.expectedOutput || '', // Map backend field name
              isHidden: tc.isHidden || false, 
              id: tc.id // Keep ID if available
            })),
          } : null, // Set to null if no codeProblem exists
        });
        setSelectedProblem(problemDetails); // Keep original selection for comparison if needed
        setIsEditingProblem(true);
      })
      .catch(err => {
        console.error("Error fetching problem details:", err);
        toast.error("Could not fetch latest problem details");
        // Fallback: Initialize with data passed in (might be stale)
        setEditProblemData({ 
            ...problem, 
            topicId: problem.topic?.id || null,
            codeProblem: null // Assume no code problem on error?
        });
        setSelectedProblem(problem);
        setIsEditingProblem(true);
      })
      .finally(() => {
        setIsLoadingProblems(false);
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Learning Path Management</h2>
          <p className="text-muted-foreground">Manage levels, topics, and problems</p>
        </div>
        <Dialog open={isAddingLevel} onOpenChange={setIsAddingLevel}>
          <DialogTrigger asChild>
            <Button>Add New Level</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
            <DialogHeader>
              <DialogTitle>Add New Level</DialogTitle>
              <DialogDescription>
                Create a new level in the learning path.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newLevel.name}
                  onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })}
                  placeholder="e.g., Level 1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newLevel.description}
                  onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })}
                  placeholder="Describe this level..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={newLevel.order}
                  onChange={(e) => setNewLevel({ ...newLevel, order: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingLevel(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLevel}>Add Level</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
                    setSelectedLevel(level);
                    setIsEditingLevel(true);
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
                            setSelectedTopic(topic);
                            setIsEditingTopic(true);
                          }}
                        >
                          Edit Topic
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTopic(topic);
                            setIsAddingProblem(true);
                          }}
                        >
                          Add Problem
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

      {/* Add Problem Collection Admin section */}
      <div className="mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Problem Collection Management</CardTitle>
            <CardDescription>Organize problems by collection/category</CardDescription>
          </CardHeader>
          <CardContent>
            <ProblemCollectionAdmin />
          </CardContent>
        </Card>
      </div>

      {/* Edit Level Dialog */}
      <Dialog open={isEditingLevel} onOpenChange={setIsEditingLevel}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Edit Level</DialogTitle>
            <DialogDescription>
              Modify the level details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-level-name">Name</Label>
              <Input
                id="edit-level-name"
                name="name"
                value={selectedLevel?.name || ""}
                onChange={handleLevelChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level-description">Description</Label>
              <Textarea
                id="edit-level-description"
                name="description"
                value={selectedLevel?.description || ""}
                onChange={handleLevelChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level-order">Order</Label>
              <Input
                id="edit-level-order"
                name="order"
                type="number"
                value={selectedLevel?.order || 1}
                onChange={handleLevelChange}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingLevel(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLevel}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={isAddingTopic} onOpenChange={setIsAddingTopic}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Add Topic</DialogTitle>
            <DialogDescription>
              Add a new topic to Level {selectedLevel?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic-name">Name</Label>
              <Input
                id="topic-name"
                value={newTopic.name}
                onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                placeholder="Topic name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic-slug">Slug</Label>
              <Input
                id="topic-slug"
                value={newTopic.slug}
                onChange={(e) => setNewTopic({ ...newTopic, slug: e.target.value })}
                placeholder="URL-friendly identifier (optional)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A URL-friendly identifier for this topic. Used in topic URLs. If left empty, will be auto-generated from the name.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic-description">Description</Label>
              <Textarea
                id="topic-description"
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="Topic description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic-content">Content</Label>
              <Textarea
                id="topic-content"
                value={newTopic.content}
                onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                placeholder="Topic content"
                className="min-h-[150px] max-h-[300px] overflow-y-auto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic-order">Order</Label>
              <Input
                id="topic-order"
                type="number"
                value={newTopic.order}
                onChange={(e) => setNewTopic({ ...newTopic, order: parseInt(e.target.value) })}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingTopic(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTopic}>Add Topic</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={isEditingTopic} onOpenChange={setIsEditingTopic}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Modify the topic details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-name">Name</Label>
              <Input
                id="edit-topic-name"
                name="name"
                value={selectedTopic?.name || ""}
                onChange={handleTopicChange}
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
              <p className="text-xs text-muted-foreground mt-1">
                A URL-friendly identifier for this topic. Used in topic URLs.
              </p>
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
                className="min-h-[150px] max-h-[300px] overflow-y-auto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-topic-order">Order</Label>
              <Input
                id="edit-topic-order"
                name="order"
                type="number"
                value={selectedTopic?.order || 1}
                onChange={handleTopicChange}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingTopic(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTopic}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Problem Dialog */}
      <Dialog open={isAddingProblem} onOpenChange={setIsAddingProblem}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Add New Problem</DialogTitle>
            <DialogDescription>
              Create a new problem for the selected topic.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={newProblem.name}
                onChange={handleProblemChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={newProblem.slug}
                onChange={handleProblemChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A URL-friendly identifier for this problem. Used in problem URLs. If left empty, will be auto-generated from the name.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                name="content"
                value={newProblem.content}
                onChange={handleProblemChange}
                className="min-h-[150px] max-h-[300px] overflow-y-auto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select 
                name="difficulty" 
                value={newProblem.difficulty}
                onValueChange={(value: string) => setNewProblem(prev => ({ ...prev, difficulty: value as ProblemDifficulty }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY_I">Easy I</SelectItem>
                  <SelectItem value="EASY_II">Easy II</SelectItem>
                  <SelectItem value="EASY_III">Easy III</SelectItem>
                  <SelectItem value="EASY_IIII">Easy IIII</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="problemType">Problem Type</Label>
              <Select 
                name="problemType" 
                value={newProblem.problemType}
                onValueChange={handleProblemTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select problem type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="CODING">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="collectionIds">Collections (Optional)</Label>
              <div className="space-y-2 border rounded-md p-3">
                {loadingCollections ? (
                  <div className="py-2 text-center text-muted-foreground">Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className="py-2 text-center text-muted-foreground">No collections found</div>
                ) : (
                  collections.map(collection => (
                    <div key={collection.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`collection-${collection.id}`}
                        checked={newProblem.collectionIds?.includes(collection.id) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewProblem(prev => ({
                              ...prev,
                              collectionIds: [...(prev.collectionIds || []), collection.id]
                            }));
                          } else {
                            setNewProblem(prev => ({
                              ...prev,
                              collectionIds: (prev.collectionIds || []).filter(id => id !== collection.id)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`collection-${collection.id}`}>{collection.name}</Label>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {newProblem.problemType === 'CODING' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="language">Programming Language</Label>
                  <Select 
                    name="language" 
                    value={newProblem.language}
                    onValueChange={(value: string) => setNewProblem(prev => ({ ...prev, language: value }))}
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
                
                <div className="grid gap-2">
                  <Label htmlFor="functionName">Function Name</Label>
                  <Input
                    id="functionName"
                    name="functionName"
                    value={newProblem.functionName}
                    onChange={handleProblemChange}
                    placeholder="solution"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="timeLimit">Time Limit (ms)</Label>
                  <Input
                    id="timeLimit"
                    name="timeLimit"
                    type="number"
                    value={newProblem.timeLimit}
                    onChange={handleProblemChange}
                    placeholder="5000"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="memoryLimit">Memory Limit (MB, optional)</Label>
                  <Input
                    id="memoryLimit"
                    name="memoryLimit"
                    type="number"
                    value={newProblem.memoryLimit || ''}
                    onChange={handleProblemChange}
                    placeholder="256"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="codeTemplate">Code Template</Label>
                  <Textarea
                    id="codeTemplate"
                    name="codeTemplate"
                    value={newProblem.codeTemplate}
                    onChange={handleProblemChange}
                    className="min-h-[150px] max-h-[300px] overflow-y-auto font-mono"
                    placeholder="function solution() {\n  // Write your code here\n}"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Test Cases</Label>
                  <div className="space-y-4 border rounded-md p-4">
                    {newProblem.testCases.map((testCase, index) => (
                      <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                          {newProblem.testCases.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newTestCases = [...newProblem.testCases];
                                newTestCases.splice(index, 1);
                                setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                              }}
                            >
                              <Trash className="h-4 w-4" />
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
                                const newTestCases = [...newProblem.testCases];
                                newTestCases[index].input = e.target.value;
                                setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                              }}
                              placeholder="Test input"
                              className="font-mono text-sm"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`test-output-${index}`} className="text-xs">
                              Expected Output <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id={`test-output-${index}`}
                              value={testCase.expected}
                              onChange={(e) => {
                                const newTestCases = [...newProblem.testCases];
                                newTestCases[index].expected = e.target.value;
                                setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
                              }}
                              placeholder="Expected output"
                              className="font-mono text-sm"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`test-hidden-${index}`}
                            checked={testCase.isHidden}
                            onCheckedChange={(checked) => {
                              const newTestCases = [...newProblem.testCases];
                              newTestCases[index].isHidden = !!checked;
                              setNewProblem(prev => ({ ...prev, testCases: newTestCases }));
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
                      onClick={() => setNewProblem(prev => ({ 
                        ...prev, 
                        testCases: [...prev.testCases, { input: '', expected: '', isHidden: false }] 
                      }))}
                      className="w-full"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Test Case
                    </Button>
                  </div>
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reqOrder">Order (if required)</Label>
              <Input
                id="reqOrder"
                name="reqOrder"
                type="number"
                value={newProblem.reqOrder}
                onChange={handleProblemChange}
                min={1}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
              <Input
                id="estimatedTime"
                name="estimatedTime"
                type="number"
                value={newProblem.estimatedTime || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  setNewProblem(prev => ({ ...prev, estimatedTime: value }));
                }}
                min={1}
                placeholder="Leave empty for no estimate"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                name="required"
                checked={newProblem.required}
                onChange={(e) => setNewProblem(prev => ({ ...prev, required: e.target.checked }))}
              />
              <Label htmlFor="required">Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingProblem(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProblem}>Add Problem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Problem Dialog */}
      <Dialog open={isEditingProblem} onOpenChange={setIsEditingProblem}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>
              Modify the problem details.
            </DialogDescription>
          </DialogHeader>
          {/* Use Tabs for consistency */}  
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="code" disabled={editProblemData?.problemType !== 'CODING'}>
                Code & Test Cases
              </TabsTrigger>
            </TabsList>
            
            {/* General Info Tab */}  
            <TabsContent value="general" className="mt-4">
              {editProblemData ? (
                <div className="grid gap-4 py-4">
                  {/* Existing General Fields - BIND to editProblemData and use new handlers */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-name">Name</Label>
                    <Input
                      id="edit-problem-name"
                      name="name"
                      value={editProblemData.name || ""}
                      onChange={handleEditProblemInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-slug">Slug</Label>
                    <Input
                      id="edit-problem-slug"
                      name="slug"
                      value={editProblemData.slug || ""}
                      onChange={handleEditProblemInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-content">Content (Markdown)</Label>
                    <Textarea
                      id="edit-problem-content"
                      name="content"
                      value={editProblemData.content || ""}
                      onChange={handleEditProblemInputChange}
                      className="min-h-[150px] max-h-[300px] overflow-y-auto"
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-problem-difficulty">Difficulty</Label>
                    <Select 
                      value={editProblemData.difficulty} 
                      onValueChange={(value: ProblemDifficulty) => handleEditProblemSelectChange('difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY_IIII">Easy IIII</SelectItem>
                        <SelectItem value="EASY_III">Easy III</SelectItem>
                        <SelectItem value="EASY_II">Easy II</SelectItem>
                        <SelectItem value="EASY_I">Easy I</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-type">Problem Type (Cannot change)</Label>
                    <Input
                      id="edit-problem-type"
                      name="problemType"
                      value={editProblemData.problemType || ""}
                      disabled // Make type non-editable for simplicity
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox // Use Checkbox component
                      id="edit-problem-required"
                      name="required"
                      checked={editProblemData.required || false}
                      onCheckedChange={(checked) => 
                          setEditProblemData(prev => 
                              prev ? { ...prev, required: !!checked } : null
                          )
                      }
                    />
                    <Label htmlFor="edit-problem-required">Required</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-reqOrder">Required Order</Label>
                    <Input
                      id="edit-problem-reqOrder"
                      name="reqOrder"
                      type="number"
                      value={editProblemData.reqOrder || ''} // Handle potential null
                      onChange={handleEditProblemInputChange}
                      min={1}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-estimatedTime">Estimated Time (minutes)</Label>
                    <Input
                      id="edit-problem-estimatedTime"
                      name="estimatedTime"
                      type="number"
                      value={editProblemData.estimatedTime || ''}
                      onChange={handleEditProblemInputChange}
                      min={1}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-collectionIds">Collections</Label>
                    <div className="space-y-2 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                      {loadingCollections ? (
                        <p>Loading collections...</p>
                      ) : collections.length === 0 ? (
                        <p>No collections available.</p>
                      ) : (
                        collections.map(collection => (
                          <div key={collection.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-collection-${collection.id}`}
                              checked={editProblemData.collectionIds?.includes(collection.id) || false}
                              onCheckedChange={(checked) => {
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
                  <div className="grid gap-2">
                    <Label htmlFor="edit-problem-topic">Topic</Label>
                    <Select 
                       value={editProblemData.topicId || 'none'} 
                       onValueChange={(value) => 
                          setEditProblemData(prev => prev ? { ...prev, topicId: value === 'none' ? null : value } : null)
                       }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic or none" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (No Topic)</SelectItem>
                        {levels.flatMap(level => 
                          level.topics.map(topic => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {level.name} - {topic.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <p>Loading problem data...</p>
              )}
            </TabsContent>
            
            {/* Code Tab */}  
            <TabsContent value="code" className="mt-4">
              {editProblemData?.problemType === 'CODING' && editProblemData.codeProblem ? (
                <div className="grid gap-4 py-4">
                  {/* Copied & Adapted Code Fields - BIND to editProblemData.codeProblem */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-code-language">Programming Language</Label>
                    <Select 
                      value={editProblemData.codeProblem.language || 'javascript'} 
                      onValueChange={(value: string) => handleEditProblemSelectChange('language', value)}
                    >
                      <SelectTrigger id="edit-code-language">
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
                  <div className="grid gap-2">
                    <Label htmlFor="edit-code-template">Code Template</Label>
                    <Textarea
                      id="edit-code-template"
                      name="codeTemplate"
                      value={editProblemData.codeProblem.codeTemplate || ""}
                      onChange={handleEditProblemCodeProblemChange}
                      className="min-h-[150px] max-h-[300px] overflow-y-auto font-mono"
                      placeholder="Optional starting code..."
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-function-name">Function Name</Label>
                    <Input
                      id="edit-function-name"
                      name="functionName"
                      value={editProblemData.codeProblem.functionName || ""}
                      onChange={handleEditProblemCodeProblemChange}
                      placeholder="e.g., solveProblem"
                    />
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="edit-time-limit">Time Limit (ms)</Label>
                       <Input
                         id="edit-time-limit"
                         name="timeLimit"
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
                         name="memoryLimit"
                         type="number"
                         value={editProblemData.codeProblem.memoryLimit || ''} // Handle potential null
                         onChange={handleEditProblemCodeProblemChange}
                         min={1}
                         placeholder="Optional"
                       />
                     </div>
                  </div>
                  {/* Test Cases Section */}
                  <div className="grid gap-2">
                    <Label>Test Cases</Label>
                    <div className="space-y-4 border rounded-md p-4 max-h-[400px] overflow-y-auto">
                      {editProblemData.codeProblem.testCases.map((testCase, index) => (
                        <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Test Case {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEditTestCase(index)}
                              disabled={editProblemData.codeProblem!.testCases.length <= 1}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`edit-test-input-${index}`} className="text-xs">Input</Label>
                              <Textarea
                                id={`edit-test-input-${index}`}
                                value={testCase.input}
                                onChange={(e) => handleEditTestCaseChange(index, 'input', e.target.value)}
                                placeholder="Test input"
                                className="font-mono text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`edit-test-output-${index}`} className="text-xs">Expected Output</Label>
                              <Textarea
                                id={`edit-test-output-${index}`}
                                value={(testCase as any).expected} // Adjust field name if needed
                                onChange={(e) => handleEditTestCaseChange(index, 'expected', e.target.value)}
                                placeholder="Expected output"
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-test-hidden-${index}`}
                              checked={testCase.isHidden}
                              onCheckedChange={(checked) => handleEditTestCaseChange(index, 'isHidden', !!checked)}
                            />
                            <Label htmlFor={`edit-test-hidden-${index}`} className="text-sm">Hidden</Label>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddEditTestCase}
                        className="w-full"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Test Case
                      </Button>
                    </div>
                  </div>
                  {/* End Test Cases */} 
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Select 'CODING' type in General Info to edit code details.</p>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProblem(false)}>Cancel</Button>
            <Button onClick={handleEditProblem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 