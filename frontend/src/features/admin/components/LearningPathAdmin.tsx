import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLearningPath, Level, Topic, Problem } from "@/hooks/useLearningPath";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/features/auth/AuthContext";
import { Link } from "react-router-dom";

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
};

type NewProblem = {
  name: string;
  content: string;
  difficulty: ProblemDifficulty;
  required: boolean;
  reqOrder: number;
  problemType: ProblemType;
  codeTemplate?: string;
  testCases?: string;
};

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
  problems: topic.problems
});

const updateProblem = (problem: Problem, updates: Partial<Problem>): Problem => ({
  ...problem,
  ...updates,
  content: updates.content ?? problem.content ?? "",
  reqOrder: updates.reqOrder ?? problem.reqOrder ?? 1
});

export function LearningPathAdmin() {
  const { token } = useAuth();
  const { levels, loading, error } = useLearningPath();
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isAddingProblem, setIsAddingProblem] = useState(false);
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const [newLevel, setNewLevel] = useState<NewLevel>({ 
    name: "", 
    description: "", 
    order: 1 
  });
  
  const [newTopic, setNewTopic] = useState<NewTopic>({ 
    name: "", 
    description: "", 
    content: "", 
    order: 1 
  });
  
  const [newProblem, setNewProblem] = useState<NewProblem>({ 
    name: "", 
    content: "", 
    difficulty: "EASY_I",
    required: false,
    reqOrder: 1,
    problemType: "INFO",
    codeTemplate: "",
    testCases: ""
  });

  const handleAddLevel = async () => {
    try {
      console.log('Adding new level:', newLevel);
      const response = await api.post("/learning/levels", newLevel, token);
      console.log('Add level response:', response);
      setIsAddingLevel(false);
      setNewLevel({ name: "", description: "", order: 1 });
      toast.success("Level added successfully");
      window.location.reload();
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
      console.log('Updating level:', selectedLevel.id, updatedLevel);
      const response = await api.put(`/learning/levels/${selectedLevel.id}`, updatedLevel, token);
      console.log('Update level response:', response);
      setIsEditingLevel(false);
      setSelectedLevel(null);
      toast.success("Level updated successfully");
      window.location.reload();
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
      console.log('Adding new topic to level:', selectedLevel.id, newTopic);
      const response = await api.post(`/learning/levels/${selectedLevel.id}/topics`, newTopic, token);
      console.log('Add topic response:', response);
      setIsAddingTopic(false);
      setNewTopic({ name: "", description: "", content: "", order: 1 });
      setSelectedLevel(null);
      toast.success("Topic added successfully");
      window.location.reload();
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
        order: selectedTopic.order
      };
      console.log('Updating topic:', selectedTopic.id, updatedTopic);
      const response = await api.put(`/learning/topics/${selectedTopic.id}`, updatedTopic, token);
      console.log('Update topic response:', response);
      setIsEditingTopic(false);
      setSelectedTopic(null);
      toast.success("Topic updated successfully");
      window.location.reload();
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
      const problemData = {
        ...newProblem,
        // Ensure we have good test data
        name: newProblem.name || "Test Problem",
        content: newProblem.content || "This is a test problem content",
        difficulty: newProblem.difficulty || "EASY_I",
        required: newProblem.required || false,
        reqOrder: newProblem.reqOrder || 1,
        problemType: newProblem.problemType || "INFO",
        // Only include codeTemplate and testCases for CODING problems
        ...(newProblem.problemType === 'CODING' ? {
          codeTemplate: newProblem.codeTemplate || "function solution() {\n  // Your code here\n}",
          testCases: newProblem.testCases || JSON.stringify([{ input: [], expected: "test" }])
        } : {})
      };
      console.log('Adding new problem to topic:', selectedTopic.id, problemData);
      const response = await api.post(`/problems`, {
        ...problemData,
        topicId: selectedTopic.id
      }, token);
      console.log('Add problem response:', response);
      setIsAddingProblem(false);
      setNewProblem({ 
        name: "", 
        content: "", 
        difficulty: "EASY_I",
        required: false,
        reqOrder: 1,
        problemType: "INFO",
        codeTemplate: "",
        testCases: ""
      });
      setSelectedTopic(null);
      toast.success("Problem added successfully");
      window.location.reload();
    } catch (err) {
      console.error("Error adding problem:", err);
      if (err instanceof Error) {
        toast.error(`Failed to add problem: ${err.message}`);
      } else {
        toast.error("Failed to add problem");
      }
    }
  };

  const handleEditProblem = async () => {
    if (!selectedProblem) return;
    try {
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
        } : {})
      };
      console.log('Updating problem:', selectedProblem.id, updatedProblem);
      const response = await api.put(`/problems/${selectedProblem.id}`, updatedProblem, token);
      console.log('Update problem response:', response);
      setIsEditingProblem(false);
      setSelectedProblem(null);
      toast.success("Problem updated successfully");
      window.location.reload();
    } catch (err) {
      console.error("Error updating problem:", err);
      if (err instanceof Error) {
        toast.error(`Failed to update problem: ${err.message}`);
      } else {
        toast.error("Failed to update problem");
      }
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
      [name]: name === 'reqOrder' ? parseInt(value) : value
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

  const handleDeleteTopic = async (topicId: string) => {
    try {
      console.log('Deleting topic:', topicId);
      const response = await api.delete(`/learning/topics/${topicId}`, token);
      console.log('Delete topic response:', response);
      toast.success("Topic deleted successfully");
      window.location.reload();
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
      console.log('Deleting problem:', problemId);
      const response = await api.delete(`/learning/problems/${problemId}`, token);
      console.log('Delete problem response:', response);
      toast.success("Problem deleted successfully");
      window.location.reload();
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
    const updatedValue = name === 'reqOrder' ? parseInt(value) : value;
    setSelectedProblem(prev => prev ? updateProblem(prev, { [name]: updatedValue }) : null);
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
          <DialogContent>
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
                    <CardContent>
                      <div className="space-y-2">
                        {topic.problems.map((problem) => (
                          <div key={problem.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <div className="font-medium">{problem.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {problem.difficulty} • {problem.required ? `Required (${problem.reqOrder})` : 'Optional'} • {problem.problemType}
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

      {/* Edit Level Dialog */}
      <Dialog open={isEditingLevel} onOpenChange={setIsEditingLevel}>
        <DialogContent>
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
        <DialogContent>
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
        <DialogContent>
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
        <DialogContent>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>
              Modify the problem details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-difficulty">Difficulty</Label>
              <Select 
                value={selectedProblem?.difficulty} 
                onValueChange={(value) => 
                  setSelectedProblem(prev => 
                    prev ? updateProblem(prev, { difficulty: value as ProblemDifficulty }) : null
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
              <Label htmlFor="edit-problem-required">Required</Label>
              <Input
                id="edit-problem-required"
                name="required"
                type="checkbox"
                checked={selectedProblem?.required || false}
                onChange={(e) => 
                  setSelectedProblem(prev => 
                    prev ? updateProblem(prev, { required: e.target.checked }) : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-problem-reqOrder">Required Order</Label>
              <Input
                id="edit-problem-reqOrder"
                name="reqOrder"
                type="number"
                value={selectedProblem?.reqOrder || 1}
                onChange={handleEditProblemChange}
                min={1}
              />
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