import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

type StandaloneInfoPage = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type NewInfoPage = {
  name: string;
  content: string;
  description: string;
};

export function StandaloneInfoAdmin() {
  const { token } = useAuth();
  const [infoPages, setInfoPages] = useState<StandaloneInfoPage[]>([]);
  const [newPage, setNewPage] = useState<NewInfoPage>({
    name: "",
    content: "",
    description: "",
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInfoPages();
    }
  }, [token]);

  const fetchInfoPages = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const data = await api.get("/standalone-info", token);
      console.log("API response data:", data);
      
      if (Array.isArray(data)) {
        console.log("Setting info pages:", data);
        setInfoPages(data);
      } else {
        console.error("Unexpected response format:", data);
        setInfoPages([]);
      }
    } catch (error) {
      console.error("Error fetching info pages:", error);
      toast.error("Failed to fetch info pages");
      setInfoPages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add effect to log state changes
  useEffect(() => {
    console.log("Current infoPages state:", infoPages);
  }, [infoPages]);

  const handleAddPage = async () => {
    if (!token) return;

    // Validate required fields
    if (!newPage.name.trim() || !newPage.content.trim()) {
      toast.error("Name and content are required");
      return;
    }

    try {
      await api.post("/standalone-info", {
        ...newPage,
        name: newPage.name.trim(),
        content: newPage.content.trim(),
        description: newPage.description.trim()
      }, token);
      toast.success("Info page created successfully");
      setIsAddDialogOpen(false);
      setNewPage({ name: "", content: "", description: "" });
      fetchInfoPages();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create info page";
      toast.error(errorMessage);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!token) return;

    try {
      await api.delete(`/standalone-info/${id}`, token);
      toast.success("Info page deleted successfully");
      fetchInfoPages();
    } catch (error) {
      toast.error("Failed to delete info page");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewPage((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const filteredPages = useMemo(() => {
    console.log("Filtering pages from:", infoPages);
    if (!Array.isArray(infoPages)) {
      console.error("infoPages is not an array:", infoPages);
      return [];
    }
    return infoPages.filter((page) => {
      console.log("Filtering page:", page);
      return page.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [infoPages, searchQuery]);

  // Add effect to log filtered results
  useEffect(() => {
    console.log("Filtered pages:", filteredPages);
    console.log("Search query:", searchQuery);
    console.log("Current token:", token);
  }, [filteredPages, searchQuery, token]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standalone Info Pages</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log("Rendering with:", { infoPages, filteredPages, isLoading });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Standalone Info Pages ({infoPages.length})</CardTitle>
            <CardDescription>Manage standalone information pages</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("Manual refresh triggered");
              fetchInfoPages();
            }}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Input
            placeholder="Search info pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Info Page</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Info Page</DialogTitle>
                <DialogDescription>
                  Add a new standalone information page to the system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newPage.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={newPage.description}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={newPage.content}
                    onChange={handleChange}
                    rows={10}
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">* Required fields</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPage}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {Array.isArray(filteredPages) && filteredPages.map((page) => (
            <Card key={page.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">{page.name}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(page.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePage(page.id)}
                  >
                    Delete
                  </Button>
                </div>
                {page.description && (
                  <CardDescription className="mt-2">{page.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                    Content available ({page.content.length} characters)
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!Array.isArray(filteredPages) || filteredPages.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No info pages found. {infoPages.length > 0 ? `(${infoPages.length} total pages)` : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 