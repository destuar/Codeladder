import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Pencil, Trash2, Search, RefreshCw } from "lucide-react";

// Types
interface Collection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Problem {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  problemType: string;
  createdAt: string;
}

interface NewCollection {
  name: string;
  description: string;
}

/**
 * Admin component for managing problem collections
 */
export function ProblemListAdmin() {
  const { token } = useAuth();
  
  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  
  // Collection problems state
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form state
  const [newCollection, setNewCollection] = useState<NewCollection>({
    name: "",
    description: ""
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch collections on component mount
  useEffect(() => {
    if (token) {
      fetchCollections();
    }
  }, [token]);
  
  // Fetch problems when a collection is selected
  useEffect(() => {
    if (token && selectedCollection) {
      fetchProblemsForCollection(selectedCollection.id);
    }
  }, [token, selectedCollection]);
  
  // Fetch all collections
  const fetchCollections = async () => {
    if (!token) return;
    
    setIsLoadingCollections(true);
    try {
      const data = await api.get("/admin/collections", token);
      setCollections(data);
      
      // Select the first collection if no collection is selected
      if (data.length > 0 && !selectedCollection) {
        setSelectedCollection(data[0]);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to fetch collections");
    } finally {
      setIsLoadingCollections(false);
    }
  };
  
  // Fetch problems for a specific collection
  const fetchProblemsForCollection = async (collectionId: string) => {
    if (!token) return;
    
    setIsLoadingProblems(true);
    try {
      const data = await api.get(`/admin/collections/${collectionId}/problems`, token);
      setProblems(data);
    } catch (error) {
      console.error(`Error fetching problems for collection ${collectionId}:`, error);
      toast.error("Failed to fetch problems for this collection. The feature is temporarily unavailable.");
      setProblems([]);
    } finally {
      setIsLoadingProblems(false);
    }
  };
  
  // Create a new collection
  const handleCreateCollection = async () => {
    if (!token) return;
    
    // Validate input
    if (!newCollection.name.trim()) {
      toast.error("Collection name is required");
      return;
    }
    
    try {
      const created = await api.post("/admin/collections", {
        name: newCollection.name.trim(),
        description: newCollection.description.trim()
      }, token);
      
      setCollections(prev => [...prev, created]);
      setIsAddDialogOpen(false);
      setNewCollection({ name: "", description: "" });
      toast.success("Collection created successfully");
      
      // Select the new collection
      setSelectedCollection(created);
    } catch (error: any) {
      console.error("Error creating collection:", error);
      toast.error(error.message || "Failed to create collection");
    }
  };
  
  // Update an existing collection
  const handleUpdateCollection = async () => {
    if (!token || !selectedCollection) return;
    
    // Validate input
    if (!newCollection.name.trim()) {
      toast.error("Collection name is required");
      return;
    }
    
    try {
      const updated = await api.put(`/admin/collections/${selectedCollection.id}`, {
        name: newCollection.name.trim(),
        description: newCollection.description.trim()
      }, token);
      
      setCollections(prev => 
        prev.map(c => c.id === updated.id ? updated : c)
      );
      setSelectedCollection(updated);
      setIsEditDialogOpen(false);
      toast.success("Collection updated successfully");
    } catch (error: any) {
      console.error("Error updating collection:", error);
      toast.error(error.message || "Failed to update collection");
    }
  };
  
  // Delete a collection
  const handleDeleteCollection = async (collectionId: string) => {
    if (!token) return;
    
    if (!confirm("Are you sure you want to delete this collection?")) {
      return;
    }
    
    try {
      await api.delete(`/admin/collections/${collectionId}`, token);
      
      // Update state
      setCollections(prev => prev.filter(c => c.id !== collectionId));
      
      // If the deleted collection was selected, select another one
      if (selectedCollection?.id === collectionId) {
        const remaining = collections.filter(c => c.id !== collectionId);
        setSelectedCollection(remaining.length > 0 ? remaining[0] : null);
      }
      
      toast.success("Collection deleted successfully");
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error("Failed to delete collection");
    }
  };
  
  // Open edit dialog with current collection data
  const openEditDialog = () => {
    if (selectedCollection) {
      setNewCollection({
        name: selectedCollection.name,
        description: selectedCollection.description || ""
      });
      setIsEditDialogOpen(true);
    }
  };
  
  // Handle input changes for forms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCollection(prev => ({ ...prev, [name]: value }));
  };
  
  // Filter collections based on search query
  const filteredCollections = collections.filter(collection => 
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Problem List Editor</CardTitle>
              <CardDescription>
                Manage problem collections and their contents
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCollections}
              disabled={isLoadingCollections}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Main content area with collections and problems */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collections panel (1/3 width) */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Collections</CardTitle>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Collection</DialogTitle>
                          <DialogDescription>
                            Add a new collection for organizing problems.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                              id="name"
                              name="name"
                              value={newCollection.name}
                              onChange={handleInputChange}
                              placeholder="Enter collection name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              name="description"
                              value={newCollection.description}
                              onChange={handleInputChange}
                              placeholder="Enter collection description"
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateCollection}>
                            Create Collection
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search collections..." 
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-1">
                    {isLoadingCollections ? (
                      <div className="py-8 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : filteredCollections.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        {searchQuery ? "No matching collections" : "No collections found"}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredCollections.map((collection) => (
                          <div 
                            key={collection.id}
                            className={`flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted ${
                              selectedCollection?.id === collection.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedCollection(collection)}
                          >
                            <div className="truncate">
                              <span className="font-medium">{collection.name}</span>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCollection(collection);
                                  openEditDialog();
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCollection(collection.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Problems panel (2/3 width) */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedCollection ? selectedCollection.name : 'Problems'}
                      </CardTitle>
                      {selectedCollection?.description && (
                        <CardDescription className="line-clamp-1">
                          {selectedCollection.description}
                        </CardDescription>
                      )}
                    </div>
                    
                    {selectedCollection && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={openEditDialog}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit Collection
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  {!selectedCollection ? (
                    <div className="py-12 text-center text-muted-foreground">
                      Select a collection to view its problems
                    </div>
                  ) : isLoadingProblems ? (
                    <div className="py-12 flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : problems.length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                      <p className="text-muted-foreground">
                        No problems in this collection
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Collection problem management is being set up. You'll be able to add problems to collections soon.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {problems.map((problem) => (
                            <TableRow key={problem.id}>
                              <TableCell className="font-medium">{problem.name}</TableCell>
                              <TableCell>{problem.problemType}</TableCell>
                              <TableCell>{problem.difficulty}</TableCell>
                              <TableCell>
                                {new Date(problem.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit collection dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update the details of this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                name="name"
                value={newCollection.name}
                onChange={handleInputChange}
                placeholder="Enter collection name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={newCollection.description}
                onChange={handleInputChange}
                placeholder="Enter collection description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCollection}>
              Update Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 