import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Problem, Topic, Level } from "@/hooks/useLearningPath";

// Add global type declaration to fix TypeScript error
declare global {
  interface Window {
    addProblemToCollection?: (problemId: string, collectionId: string) => Promise<boolean>;
  }
}

// Types
interface DynamicCollection {
  id: string;
  name: string;
  description: string | null;
}

// Define cache types
interface ProblemCache {
  [problemId: string]: {
    data: Problem;
    timestamp: number;
  };
}

type ProblemDifficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
type ProblemType = 'INFO' | 'CODING';

type NewProblem = {
  name: string;
  content: string;
  difficulty: ProblemDifficulty;
  required: boolean;
  reqOrder: number;
  problemType: ProblemType;
  codeTemplate: string;
  testCases: string;
  estimatedTime?: number;
  collectionIds: string[];
};

interface DragData {
  type: 'problem';
  problemId: string;
  sourceType: 'collection' | 'topic';
  sourceId: string;
  problem: Problem;
}

// Add type definition for topics with level information
interface TopicWithLevel extends Topic {
  levelName: string;
  levelOrder: number;
}

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

export function ProblemCollectionAdmin() {
  const { token } = useAuth();
  const [collections, setCollections] = useState<DynamicCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [isAddingProblem, setIsAddingProblem] = useState(false);
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverHighlight, setDragOverHighlight] = useState(false);
  const [topics, setTopics] = useState<TopicWithLevel[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  // Problem cache with 5 minute expiration
  const problemCacheRef = useRef<ProblemCache>({});
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Collection problems cache
  const collectionProblemsCache = useRef<{[collectionId: string]: {problems: Problem[], timestamp: number}}>({});

  const [newProblem, setNewProblem] = useState<NewProblem>({ 
    name: "", 
    content: "", 
    difficulty: "EASY_I",
    required: false,
    reqOrder: 1,
    problemType: "INFO",
    codeTemplate: "",
    testCases: "",
    estimatedTime: undefined,
    collectionIds: []
  });

  // Function to handle drag start
  const handleDragStart = (e: React.DragEvent, problem: Problem) => {
    if (!selectedCollection) return;
    
    setIsDragging(true);
    
    // Create drag data payload
    const dragData: DragData = {
      type: 'problem',
      problemId: problem.id,
      sourceType: 'collection',
      sourceId: selectedCollection,
      problem: problem
    };
    
    // Set drag data
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
    
    // Store the ghost element in a dataset attribute for later removal
    const target = e.target as HTMLElement;
    target.dataset.ghostElementId = Date.now().toString();
    
    // Clean up ghost element after drag
    setTimeout(() => {
      try {
        document.body.removeChild(ghostElement);
      } catch (err) {
        console.log('Ghost element already removed');
      }
    }, 100);
  };

  // Function to handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Make the drop effect more visible to users
    const target = e.currentTarget;
    target.classList.add('border-primary', 'border-2', 'bg-primary/10');
    
    // Add pulsing animation for better visibility
    if (!target.classList.contains('animate-pulse')) {
      target.classList.add('animate-pulse');
    }
    
    let canDrop = false;
    
    try {
      const dataString = e.dataTransfer.getData('application/json');
      if (!dataString) {
        // If we can't get the data yet, assume it's a valid drag operation
        e.dataTransfer.dropEffect = 'move';
        setDragOverHighlight(true);
        return;
      }
      
      const dragData = JSON.parse(dataString) as DragData;
      
      if (selectedCollection === "no-collection") {
        // When over the "No Collection" area, only accept drags from collections
        if (dragData.type === 'problem' && dragData.sourceType === 'collection') {
          canDrop = true;
        }
      } else {
        // Normal collection behavior
        // Only accept problem drags from topics or other collections
        if (dragData.type === 'problem' && 
            (dragData.sourceType === 'topic' || 
             (dragData.sourceType === 'collection' && dragData.sourceId !== selectedCollection))) {
          canDrop = true;
        }
      }
      
      if (canDrop) {
        e.dataTransfer.dropEffect = 'move';
        setDragOverHighlight(true);
      } else {
        e.dataTransfer.dropEffect = 'none';
        // Remove highlights if we can't drop
        target.classList.remove('border-primary', 'border-2', 'bg-primary/10', 'animate-pulse');
      }
    } catch (err) {
      // Handle case where drag data might not be available yet
      // This is a normal part of drag operations, not an error
      e.dataTransfer.dropEffect = 'move';
      setDragOverHighlight(true);
    }
  };

  // Function to handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('border-primary', 'border-2', 'bg-primary/10', 'animate-pulse');
    setDragOverHighlight(false);
  };

  // Function to handle drop from other components
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual indicator
    const target = e.currentTarget;
    target.classList.remove('border-primary', 'border-2', 'bg-primary/10', 'animate-pulse');
    setDragOverHighlight(false);
    
    try {
      // Get drag data
      const dragDataString = e.dataTransfer.getData('application/json');
      if (!dragDataString) {
        console.log("No drag data found");
        return;
      }
      
      const dragData = JSON.parse(dragDataString) as DragData;
      console.log("Processing drop with data:", dragData);
      
      // Only handle problem drag from topics or other collections
      if (dragData.type !== 'problem') {
        console.log("Not a problem drag, ignoring");
        return;
      }
      
      // Check if we have a valid selected collection
      if (!selectedCollection) {
        console.log("No collection selected, cannot process drop");
        toast.error("Please select a collection first");
        return;
      }
      
      // Fetch the latest version of the problem to ensure we have up-to-date data
      const problem = await getProblem(dragData.problemId);
      console.log("Got updated problem data:", problem);
      
      // Handle different scenarios based on source type and destination
      if (selectedCollection === "no-collection") {
        // SCENARIO 1: Dropping into "No Collection" area
        console.log("Processing drop to No Collection area - remove from topic and all collections");
        
        // If coming from a topic, first remove from topic
        if (dragData.sourceType === 'topic' || problem.topic) {
          try {
            console.log("Removing problem from topic:", problem.topic?.id);
            // First try to use the dedicated endpoint
            await api.put(`/problems/${dragData.problemId}/remove-topic`, {}, token);
            toast.success("Problem removed from topic");
            
            // Dispatch a custom event to notify LearningPathAdmin that a problem was removed from a topic
            if (dragData.sourceType === 'topic' && dragData.sourceId) {
              const event = new CustomEvent('problem-removed-from-topic', { 
                detail: { 
                  problemId: dragData.problemId,
                  topicId: dragData.sourceId 
                } 
              });
              window.dispatchEvent(event);
            }
          } catch (topicError) {
            console.error("Error removing from topic:", topicError);
            // Fallback to direct update
            try {
              await api.put(`/problems/${dragData.problemId}`, {
                topicId: null,
                reqOrder: null
              }, token);
              toast.success("Problem removed from topic");
              
              // Dispatch a custom event to notify LearningPathAdmin that a problem was removed from a topic
              if (dragData.sourceType === 'topic' && dragData.sourceId) {
                const event = new CustomEvent('problem-removed-from-topic', { 
                  detail: { 
                    problemId: dragData.problemId,
                    topicId: dragData.sourceId 
                  } 
                });
                window.dispatchEvent(event);
              }
            } catch (err) {
              console.error("Failed to remove problem from topic:", err);
              toast.error("Failed to remove problem from topic");
              return;
            }
          }
        }
        
        // Now remove from all collections
        if (problem.collectionIds && problem.collectionIds.length > 0) {
          console.log("Removing problem from all collections:", problem.collectionIds);
          
          try {
            // Loop through all collections and remove the problem from each
            for (const collectionId of problem.collectionIds) {
              await api.delete(`/admin/collections/${collectionId}/problems/${dragData.problemId}`, token);
              console.log(`Removed problem from collection: ${collectionId}`);
            }
            toast.success("Problem removed from all collections");
          } catch (err) {
            console.error("Error removing problem from collections:", err);
            toast.error("Failed to remove problem from some collections");
          }
        }
        
        // Refresh the problem list to show our newly orphaned problem
        await refreshNoCollectionProblems();
      } else {
        // SCENARIO 2: Dropping into a specific collection
        console.log("Processing drop to collection:", selectedCollection);
        
        // If coming from a topic, first remove from topic
        if (dragData.sourceType === 'topic' || problem.topic) {
          try {
            console.log("Removing problem from topic:", problem.topic?.id);
            // First try to use the dedicated endpoint
            await api.put(`/problems/${dragData.problemId}/remove-topic`, {}, token);
            toast.success("Problem removed from topic");
            
            // Dispatch a custom event to notify LearningPathAdmin that a problem was removed from a topic
            if (dragData.sourceType === 'topic' && dragData.sourceId) {
              const event = new CustomEvent('problem-removed-from-topic', { 
                detail: { 
                  problemId: dragData.problemId,
                  topicId: dragData.sourceId 
                } 
              });
              window.dispatchEvent(event);
            }
          } catch (topicError) {
            console.error("Error removing from topic:", topicError);
            // Fallback to direct update
            try {
              await api.put(`/problems/${dragData.problemId}`, {
                topicId: null,
                reqOrder: null
              }, token);
              toast.success("Problem removed from topic");
              
              // Dispatch a custom event to notify LearningPathAdmin that a problem was removed from a topic
              if (dragData.sourceType === 'topic' && dragData.sourceId) {
                const event = new CustomEvent('problem-removed-from-topic', { 
                  detail: { 
                    problemId: dragData.problemId,
                    topicId: dragData.sourceId 
                  } 
                });
                window.dispatchEvent(event);
              }
            } catch (err) {
              console.error("Failed to remove problem from topic:", err);
              toast.error("Failed to remove problem from topic");
              return;
            }
          }
        }
        
        // Check if the problem is already in the selected collection
        if (problem.collectionIds && problem.collectionIds.includes(selectedCollection)) {
          console.log("Problem already in this collection, skipping add");
        } else {
          // Add to the selected collection
          try {
            await api.post(`/admin/collections/${selectedCollection}/problems`, { problemId: dragData.problemId }, token);
            console.log(`Added problem to collection: ${selectedCollection}`);
            toast.success(`Problem added to ${collections.find(c => c.id === selectedCollection)?.name}`);
            
            // If the added problem belongs to the currently selected collection, refresh
            if (selectedCollection === selectedCollection) {
              await refreshCollectionProblems(selectedCollection);
            }
          } catch (err) {
            console.error("Error adding problem to collection:", err);
            toast.error("Failed to add problem to collection");
          }
        }
        
        // Refresh the problems in the current collection
        if (selectedCollection) {
          await refreshCollectionProblems(selectedCollection);
        }
      }
      
      // Invalidate cache for affected collections
      if (selectedCollection && selectedCollection !== "no-collection") {
        invalidateCollectionCache(selectedCollection);
      }
      
      // If the problem was in other collections, invalidate their caches too
      if (problem.collectionIds) {
        for (const collectionId of problem.collectionIds) {
          invalidateCollectionCache(collectionId);
        }
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      toast.error("Failed to process drag and drop operation");
    }
  };

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

  // Add a dedicated function to refresh the "No Collection" view
  const refreshNoCollectionProblems = async () => {
    setLoadingProblems(true);
    try {
      // Use the new admin dashboard endpoint to fetch all needed data in one request
      const problems = await api.get("/problems/admin/dashboard?collection=no-collection&withTopics=false", token);
      console.log(`Found ${problems.length} problems without collections and without topics`);
      setProblems(problems);
    } catch (error) {
      console.error("Error fetching problems without collections:", error);
      toast.error("Failed to fetch problems without collections");
      setProblems([]);
    } finally {
      setLoadingProblems(false);
    }
  };

  // Helper function to refresh collection problems with filtering and caching
  const refreshCollectionProblems = async (collectionId: string) => {
    try {
      const now = Date.now();
      const cached = collectionProblemsCache.current[collectionId];
      
      // If we have recently cached collection problems, use them
      if (cached && now - cached.timestamp < CACHE_EXPIRY) {
        console.log(`Using cached problems for collection ${collectionId}`);
        setProblems(cached.problems);
        return;
      }
      
      // Use the new comprehensive endpoint to get all data in one request
      const problems = await api.get(
        `/problems/admin/dashboard?collection=${collectionId}&withTopics=false`, 
        token
      );
      
      // Cache the filtered problems
      collectionProblemsCache.current[collectionId] = {
        problems,
        timestamp: now
      };
      
      setProblems(problems);
    } catch (error) {
      console.error("Error refreshing collection problems:", error);
      toast.error("Failed to refresh problems");
    }
  };
  
  // Clear collection cache when certain actions are performed
  const invalidateCollectionCache = (collectionId: string) => {
    if (collectionProblemsCache.current[collectionId]) {
      delete collectionProblemsCache.current[collectionId];
    }
  };

  // Fetch collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      if (!token) return;
      
      setLoadingCollections(true);
      try {
        const data = await api.get("/admin/collections", token);
        setCollections(data);
        
        // Select the first collection by default
        if (data.length > 0 && !selectedCollection) {
          setSelectedCollection(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        toast.error("Failed to fetch collections");
      } finally {
        setLoadingCollections(false);
      }
    };
    
    fetchCollections();
  }, [token]);

  // Fetch problems for the selected collection
  useEffect(() => {
    const fetchProblems = async () => {
      if (!token || !selectedCollection) return;
      
      setLoadingProblems(true);
      try {
        await refreshCollectionProblems(selectedCollection);
      } catch (error) {
        console.error("Error fetching problems:", error);
        toast.error("Failed to fetch problems for this collection");
        setProblems([]);
      } finally {
        setLoadingProblems(false);
      }
    };
    
    fetchProblems();
  }, [token, selectedCollection]);

  // Fetch all topics for the dropdown
  useEffect(() => {
    const fetchTopics = async () => {
      if (!token) return;
      
      setLoadingTopics(true);
      try {
        // Fetch all levels to get all topics
        const levels = await api.get("/learning/levels", token);
        
        // Extract all topics from all levels
        const allTopics = levels.flatMap((level: Level) => 
          level.topics.map((topic: Topic) => ({
            ...topic,
            levelName: level.name, // Include level name for better context
            levelOrder: level.order
          }))
        );
        
        // Sort topics by level order then topic order
        const sortedTopics = allTopics.sort((a: TopicWithLevel, b: TopicWithLevel) => {
          if (a.levelOrder !== b.levelOrder) {
            return a.levelOrder - b.levelOrder;
          }
          return a.order - b.order;
        });
        
        setTopics(sortedTopics);
      } catch (error) {
        console.error("Error fetching topics:", error);
        toast.error("Failed to fetch topics");
      } finally {
        setLoadingTopics(false);
      }
    };
    
    fetchTopics();
  }, [token]);

  // Modify the collection change handler to use our new refresh function
  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    
    // Handle the special "no-collection" case
    if (value === "no-collection") {
      refreshNoCollectionProblems();
    }
  };

  const handleAddProblem = async () => {
    try {
      // Make sure the selected collection is included in collectionIds
      if (selectedCollection && !newProblem.collectionIds.includes(selectedCollection)) {
        newProblem.collectionIds.push(selectedCollection);
      }
      
      // Create problem with necessary data
      const problemData = {
        name: newProblem.name,
        content: newProblem.content,
        difficulty: newProblem.difficulty,
        required: newProblem.required,
        reqOrder: newProblem.reqOrder,
        problemType: newProblem.problemType,
        collectionIds: newProblem.collectionIds,
        ...(newProblem.problemType === 'CODING' ? {
          codeTemplate: newProblem.codeTemplate,
          testCases: newProblem.testCases
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
        testCases: "",
        estimatedTime: undefined,
        collectionIds: []
      });
      
      toast.success("Problem added to collection successfully");
      
      // Refresh problems list with filtering
      if (selectedCollection) {
        await refreshCollectionProblems(selectedCollection);
      }
    } catch (err) {
      console.error("Error adding problem:", err);
      if (err instanceof Error) {
        toast.error(`Failed to add problem: ${err.message}`);
      } else {
        toast.error("Failed to add problem");
      }
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!confirm("Are you sure you want to delete this problem? This will remove it completely from the system.")) {
      return;
    }
    
    try {
      await api.delete(`/learning/problems/${problemId}`, token);
      toast.success("Problem deleted successfully");
      
      // Refresh problems list with filtering
      if (selectedCollection) {
        await refreshCollectionProblems(selectedCollection);
      }
    } catch (err) {
      console.error("Error deleting problem:", err);
      if (err instanceof Error) {
        toast.error(`Failed to delete problem: ${err.message}`);
      } else {
        toast.error("Failed to delete problem");
      }
    }
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
      ...(value === 'INFO' ? { codeTemplate: '', testCases: '' } : {})
    }));
  };

  const handleRemoveFromCollection = async (problemId: string) => {
    if (!selectedCollection) return;
    
    try {
      // Retrieve the current problem to check if it's in multiple collections
      const problem = problems.find(p => p.id === problemId);
      if (!problem) return;
      
      // If the problem is only in this collection and no others, confirm if the user wants to remove it
      // This effectively creates the "no collection" bucket
      const isInMultipleCollections = problem.collectionIds && problem.collectionIds.length > 1;
      
      if (!isInMultipleCollections) {
        if (!window.confirm("This problem is only in this collection. Removing it will leave it without any collection. Continue?")) {
          return;
        }
      }
      
      // Remove the problem from the collection
      await api.delete(`/admin/collections/${selectedCollection}/problems/${problemId}`, token);
      console.log(`Removed problem from collection: ${selectedCollection}`);
      toast.success(`Problem removed from collection`);
      
      // Invalidate the cache for this collection
      invalidateCollectionCache(selectedCollection);
      
      // Refresh the problems in the current collection
      if (selectedCollection) {
        await refreshCollectionProblems(selectedCollection);
      }
    } catch (err) {
      console.error("Error removing problem from collection:", err);
      toast.error("Failed to remove problem from collection");
    }
  };

  const handleEditProblemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedProblem) return;
    const { name, value } = e.target;
    const updatedValue = name === 'reqOrder' ? (value === '' ? 1 : Math.max(1, parseInt(value) || 1)) : value;
    setSelectedProblem(prev => prev ? {...prev, [name]: updatedValue} : null);
  };

  const handleEditProblemTypeChange = (value: string) => {
    if (!selectedProblem) return;
    setSelectedProblem(prev => prev ? {
      ...prev,
      problemType: value as ProblemType,
      // Reset coding-specific fields when switching to INFO type
      ...(value === 'INFO' ? { codeTemplate: '', testCases: '' } : {})
    } : null);
  };

  const handleEditProblem = async () => {
    if (!selectedProblem) return;
    try {
      // Get current topic ID (if any)
      const currentTopicId = selectedProblem.topic?.id;
      
      // Check if we're changing the topic
      if (selectedTopicId !== currentTopicId) {
        if (selectedTopicId) {
          // Moving to a new topic
          console.log(`Moving problem from ${currentTopicId || 'no topic'} to topic ${selectedTopicId}`);
          
          // Get the max reqOrder of the target topic's problems
          let maxReqOrder = 0;
          if (selectedTopicId) {
            const topic = topics.find(t => t.id === selectedTopicId);
            if (topic && topic.problems && topic.problems.length > 0) {
              maxReqOrder = Math.max(...topic.problems.map(p => p.reqOrder || 0));
            }
          }
          
          // First update the problem without the topic
          const updatedProblem = {
            name: selectedProblem.name,
            content: selectedProblem.content || "",
            difficulty: selectedProblem.difficulty,
            required: selectedProblem.required,
            reqOrder: selectedProblem.reqOrder || 1,
            problemType: selectedProblem.problemType,
            ...(selectedProblem.problemType === 'CODING' ? {
              codeTemplate: selectedProblem.codeTemplate,
              testCases: selectedProblem.testCases
            } : {}),
            ...(selectedProblem.estimatedTime ? { estimatedTime: selectedProblem.estimatedTime } : {}),
            collectionIds: selectedProblem.collectionIds || [],
            // Don't set topic here as we'll use the API to add it to the topic
          };
          
          // If problem is being moved from one topic to another
          if (selectedTopicId) {
            // First remove from current topic if it has one
            if (selectedProblem.topic) {
              await api.delete(`/learning/topics/problems/${selectedProblem.id}`, token);
            }
            
            // Then add the problem to the new topic
            await api.post(`/learning/topics/${selectedTopicId}/problems/${selectedProblem.id}`, {}, token);
            console.log(`Problem updated: ${selectedProblem.id}`);
            toast.success("Problem updated and moved to new topic");
          } else {
            // If problem is being removed from a topic
            if (selectedProblem.topic) {
              // First try the dedicated endpoint for removing a problem from its topic
              try {
                await api.delete(`/learning/topics/problems/${selectedProblem.id}`, token);
                console.log("Problem removed from topic using delete endpoint");
              } catch (topicRemoveError) {
                console.error("Failed to remove problem from topic using delete endpoint:", topicRemoveError);
                
                // Fallback: Try the problem-specific endpoint for removing a topic
                try {
                  await api.put(`/problems/${selectedProblem.id}/remove-topic`, {}, token);
                  console.log("Problem removed from topic using remove-topic endpoint");
                } catch (fallbackError) {
                  console.error("Failed to remove problem from topic using fallback endpoint:", fallbackError);
                  
                  // Final fallback: Update the problem directly with topicId: null
                  const problemWithoutTopic = {
                    name: selectedProblem.name,
                    content: selectedProblem.content || "",
                    difficulty: selectedProblem.difficulty,
                    required: selectedProblem.required,
                    reqOrder: selectedProblem.reqOrder || 1,
                    problemType: selectedProblem.problemType,
                    ...(selectedProblem.problemType === 'CODING' ? {
                      codeTemplate: selectedProblem.codeTemplate,
                      testCases: selectedProblem.testCases
                    } : {}),
                    ...(selectedProblem.estimatedTime ? { estimatedTime: selectedProblem.estimatedTime } : {}),
                    collectionIds: selectedProblem.collectionIds || [],
                    topicId: null
                  };
                  await api.put(`/problems/${selectedProblem.id}`, problemWithoutTopic, token);
                  console.log("Problem removed from topic using direct update with null topicId");
                }
              }
            }
            
            await api.put(`/problems/${selectedProblem.id}`, updatedProblem, token);
            console.log(`Problem updated: ${selectedProblem.id}`);
            toast.success("Problem updated and removed from topic");
          }
        } else {
          // Moving to no topic (null)
          console.log(`Removing problem from topic ${currentTopicId}`);
          
          // Set a unique temporary reqOrder
          const tempReqOrder = Date.now();
          
          // Update the problem to remove its topic association
          const updatedProblem = {
            name: selectedProblem.name,
            content: selectedProblem.content || "",
            difficulty: selectedProblem.difficulty,
            required: selectedProblem.required,
            reqOrder: tempReqOrder,
            problemType: selectedProblem.problemType,
            ...(selectedProblem.problemType === 'CODING' ? {
              codeTemplate: selectedProblem.codeTemplate,
              testCases: selectedProblem.testCases
            } : {}),
            ...(selectedProblem.estimatedTime ? { estimatedTime: selectedProblem.estimatedTime } : {}),
            collectionIds: selectedProblem.collectionIds || [],
            topic: null,
            topicId: null
          };
          
          await api.put(`/problems/${selectedProblem.id}`, updatedProblem, token);
          console.log(`Problem updated: ${selectedProblem.id}`);
          toast.success("Problem updated and removed from topic");
        }
      } else {
        // Not changing topic, just update the problem
        // Create the updatedProblem object here since it doesn't exist in this scope
        const updatedProblem = {
          name: selectedProblem.name,
          content: selectedProblem.content || "",
          difficulty: selectedProblem.difficulty,
          required: selectedProblem.required,
          reqOrder: selectedProblem.reqOrder || 1,
          problemType: selectedProblem.problemType,
          ...(selectedProblem.problemType === 'CODING' ? {
            codeTemplate: selectedProblem.codeTemplate,
            testCases: selectedProblem.testCases
          } : {}),
          ...(selectedProblem.estimatedTime ? { estimatedTime: selectedProblem.estimatedTime } : {}),
          collectionIds: selectedProblem.collectionIds || [],
        };
        
        await api.put(`/problems/${selectedProblem.id}`, updatedProblem, token);
        console.log(`Problem updated: ${selectedProblem.id}`);
        toast.success("Problem updated successfully");
      }
      
      setIsEditingProblem(false);
      setSelectedProblem(null);
      setSelectedTopicId(null);
      
      // Refresh the current collection to show the updated problem
      if (selectedCollection) {
        await refreshCollectionProblems(selectedCollection);
      }
    } catch (err) {
      console.error("Error updating problem:", err);
      if (err instanceof Error) {
        toast.error(`Failed to update problem: ${err.message}`);
      } else {
        toast.error("Failed to update problem");
      }
    }
  };

  // Update handleDragEnd to reset state
  const handleDragEnd = () => {
    setIsDragging(false);
    // No reordering needed for collections, they don't have an explicit order
  };

  // Update the window.addProblemToCollection function with proper types
  window.addProblemToCollection = async (problemId: string, collectionId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No token found, cannot add problem to collection");
        toast.error("Authentication error");
        return false;
      }
      
      console.log(`Adding problem ${problemId} to collection ${collectionId}`);
      
      // Fetch the problem to check its current status
      const problem = await getProblem(problemId);
      
      // Check if the problem has a topic and try to remove it
      if (problem.topic) {
        console.log("Problem has a topic, attempting to remove before adding to collection");
        
        try {
          // Try the dedicated endpoint for removing a problem from its topic
          await api.delete(`/learning/topics/problems/${problem.id}`, token);
          console.log("Problem removed from topic using delete endpoint");
        } catch (topicRemoveError) {
          console.error("Failed to remove problem from topic using delete endpoint:", topicRemoveError);
          
          // Fallback: Try the problem-specific endpoint for removing a topic
          try {
            await api.put(`/problems/${problem.id}/remove-topic`, {}, token);
            console.log("Problem removed from topic using remove-topic endpoint");
          } catch (fallbackError) {
            console.error("Failed to remove problem from topic using fallback endpoint:", fallbackError);
            
            // Last resort: Update the problem directly with topicId: null
            try {
              const problemUpdate = {
                ...problem,
                topic: undefined,
                topicId: null  // This is passed to the API but not included in the Problem type
              };
              await api.put(`/problems/${problem.id}`, problemUpdate, token);
              console.log("Problem removed from topic using direct update with null topicId");
            } catch (directUpdateError) {
              console.error("All attempts to remove problem from topic failed:", directUpdateError);
              toast.error("Could not remove problem from its topic");
              return false; // Abort the operation if we can't remove from topic
            }
          }
        }
      }
      
      // Add problem to the specified collection
      await api.post(`/admin/collections/${collectionId}/problems`, { problemId }, token);
      console.log(`Added problem to collection: ${collectionId}`);
      toast.success(`Problem added to ${collections.find(c => c.id === collectionId)?.name}`);
      
      // Invalidate the cache for this collection
      invalidateCollectionCache(collectionId);
      
      // If the added problem belongs to the currently selected collection, refresh
      if (selectedCollection === collectionId) {
        await refreshCollectionProblems(selectedCollection);
      }
      
      return true;
    } catch (err) {
      console.error("Error adding problem to collection:", err);
      toast.error("Failed to add problem to collection");
      return false;
    }
  };

  if (loadingCollections) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 justify-end mb-4">
        <Select value={selectedCollection || ""} onValueChange={handleCollectionChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-collection">No Collection</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            if (selectedCollection && selectedCollection !== "no-collection") {
              setIsAddingProblem(true);
              // Pre-select the current collection
              setNewProblem(prev => ({
                ...prev,
                collectionIds: [selectedCollection]
              }));
            } else if (selectedCollection === "no-collection") {
              setIsAddingProblem(true);
              // No collection pre-selected
              setNewProblem(prev => ({
                ...prev,
                collectionIds: []
              }));
            } else {
              toast.error("Please select a collection first");
            }
          }}
        >
          Add Problem{selectedCollection === "no-collection" ? "" : " to Collection"}
        </Button>
      </div>
      
      <div className="bg-muted/30 border rounded-md p-4 mb-4 text-sm text-muted-foreground">
        <p className="font-medium">Note:</p>
        <p>Problems can be part of both the learning path (assigned to topics) AND in collections.</p>
        <p>However, for easier management, only problems that are not assigned to any topic will appear in this view.</p>
        <p>To add a problem that's in a topic to a collection, use the "Edit" button in the Learning Path view.</p>
      </div>
      
      <div 
        className={cn(
          "space-y-4 p-4 border-2 border-dashed rounded-lg transition-colors min-h-[200px]",
          dragOverHighlight ? "border-primary bg-primary/5" : "border-border",
          isDragging ? "opacity-75" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const target = e.currentTarget;
          target.classList.remove('border-primary', 'border-2', 'bg-primary/10', 'animate-pulse');
          handleDrop(e);
        }}
      >
        {loadingProblems ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            {selectedCollection 
              ? selectedCollection === "no-collection"
                ? "No problems without a collection. Drag problems here to remove them from all collections."
                : "No problems in this collection. Add one using the button above or drag problems here."
              : "Please select a collection from the dropdown."}
          </div>
        ) : (
          <div className="space-y-2">
            {problems.map((problem) => (
              <div 
                key={problem.id} 
                className="flex items-center justify-between p-2 rounded-lg border"
                draggable
                onDragStart={(e) => handleDragStart(e, problem)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground cursor-move select-none" aria-label="Drag handle">
                    ⣿
                  </div>
                  <div>
                    <div className="font-medium">{problem.name}</div>
                    <div className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center">
                        <Badge variant={problem.required ? "outline" : "secondary"} className="mr-2 w-[4.5rem] justify-center">
                          {problem.required ? `REQ ${problem.reqOrder || 1}` : "OPTIONAL"}
                        </Badge>
                        {problem.difficulty} • {problem.problemType}
                      </span>
                      {/* Display all collection badges */}
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
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    asChild
                  >
                    <Link to={`/problems/${problem.id}`}>View</Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedProblem(problem);
                      setIsEditingProblem(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveFromCollection(problem.id)}
                  >
                    Remove
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
        )}
      </div>

      {/* Add Problem Dialog */}
      <Dialog open={isAddingProblem} onOpenChange={setIsAddingProblem}>
        <DialogContent className="max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Problem to Collection</DialogTitle>
            <DialogDescription>
              Create a new problem and add it to the selected collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto pr-6 max-h-[75vh]">
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
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                name="content"
                value={newProblem.content}
                onChange={handleProblemChange}
                className="min-h-[100px]"
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
              <Label htmlFor="collectionIds">Additional Collections (Optional)</Label>
              <div className="space-y-2 border rounded-md p-3">
                {loadingCollections ? (
                  <div className="py-2 text-center text-muted-foreground">Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className="py-2 text-center text-muted-foreground">No collections found</div>
                ) : (
                  collections
                    .filter(collection => collection.id !== selectedCollection) // Filter out currently selected collection
                    .map(collection => (
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
                  <Label htmlFor="codeTemplate">Code Template</Label>
                  <Textarea
                    id="codeTemplate"
                    name="codeTemplate"
                    value={newProblem.codeTemplate}
                    onChange={handleProblemChange}
                    className="min-h-[100px] font-mono"
                    placeholder="function solution() {\n  // Write your code here\n}"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="testCases">Test Cases (JSON)</Label>
                  <Textarea
                    id="testCases"
                    name="testCases"
                    value={newProblem.testCases}
                    onChange={handleProblemChange}
                    className="min-h-[100px] font-mono"
                    placeholder='[{\n  "input": [],\n  "expected": "Hello, World!"\n}]'
                  />
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
            <div className="flex items-center gap-2 py-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newProblem.required}
                  onChange={(e) => setNewProblem(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="required">Required</Label>
              </div>
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
        <DialogContent className="max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>
              Modify the problem details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto pr-6 max-h-[75vh]">
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-name">Name</Label>
              <Input
                id="edit-problem-name"
                name="name"
                value={selectedProblem?.name || ""}
                onChange={handleEditProblemChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-content">Content</Label>
              <Textarea
                id="edit-problem-content"
                name="content"
                value={selectedProblem?.content || ""}
                onChange={handleEditProblemChange}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-difficulty">Difficulty</Label>
              <Select 
                value={selectedProblem?.difficulty} 
                onValueChange={(value: ProblemDifficulty) => 
                  setSelectedProblem(prev => 
                    prev ? {...prev, difficulty: value} : null
                  )
                }
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
              <Label htmlFor="edit-problem-problemType">Problem Type</Label>
              <Select 
                value={selectedProblem?.problemType}
                onValueChange={handleEditProblemTypeChange}
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
            
            {selectedProblem?.problemType === 'CODING' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-problem-codeTemplate">Code Template</Label>
                  <Textarea
                    id="edit-problem-codeTemplate"
                    name="codeTemplate"
                    value={selectedProblem?.codeTemplate || ""}
                    onChange={handleEditProblemChange}
                    className="min-h-[100px] font-mono"
                    placeholder="function solution() {\n  // Write your code here\n}"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-problem-testCases">Test Cases (JSON)</Label>
                  <Textarea
                    id="edit-problem-testCases"
                    name="testCases"
                    value={selectedProblem?.testCases || ""}
                    onChange={handleEditProblemChange}
                    className="min-h-[100px] font-mono"
                    placeholder='[{\n  "input": [],\n  "expected": "Hello, World!"\n}]'
                  />
                </div>
              </>
            )}
            
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
                      <input
                        type="checkbox"
                        id={`edit-collection-${collection.id}`}
                        checked={selectedProblem?.collectionIds?.includes(collection.id) || false}
                        onChange={(e) => {
                          if (!selectedProblem) return;
                          
                          const currentCollectionIds = selectedProblem.collectionIds || [];
                          let newCollectionIds: string[];
                          
                          if (e.target.checked) {
                            newCollectionIds = [...currentCollectionIds, collection.id];
                          } else {
                            newCollectionIds = currentCollectionIds.filter(id => id !== collection.id);
                          }
                          
                          setSelectedProblem(prev => 
                            prev ? {...prev, collectionIds: newCollectionIds} : null
                          );
                        }}
                      />
                      <Label htmlFor={`edit-collection-${collection.id}`}>{collection.name}</Label>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-reqOrder">Order (if required)</Label>
              <Input
                id="edit-problem-reqOrder"
                name="reqOrder"
                type="number"
                value={selectedProblem?.reqOrder || 1}
                onChange={handleEditProblemChange}
                min={1}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-estimatedTime">Estimated Time (minutes)</Label>
              <Input
                id="edit-problem-estimatedTime"
                name="estimatedTime"
                type="number"
                value={selectedProblem?.estimatedTime || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  setSelectedProblem(prev => 
                    prev ? {...prev, estimatedTime: value} : null
                  );
                }}
                min={1}
                placeholder="Leave empty for no estimate"
              />
            </div>
            <div className="flex items-center gap-2 py-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-problem-required"
                  checked={selectedProblem?.required || false}
                  onChange={(e) => 
                    setSelectedProblem(prev => 
                      prev ? {...prev, required: e.target.checked} : null
                    )
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-problem-required">Required</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-topic">Topic (Optional)</Label>
              <Select 
                value={selectedTopicId || ''} 
                onValueChange={(value) => setSelectedTopicId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic or none" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No Topic)</SelectItem>
                  {topics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.levelName} - {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Assigning a topic will remove this problem from all collections and move it to the learning path.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProblem(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProblem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 