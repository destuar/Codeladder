import { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { Pencil, Trash2 } from "lucide-react";
import { LoadingCard } from '@/components/ui/loading-spinner';

type StandaloneInfoPage = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  estimatedTime?: number;
  createdAt: string;
  updatedAt: string;
  slug?: string;
};

type PageFormData = {
  name: string;
  content: string;
  description: string;
  estimatedTime?: number;
  slug: string;
};

export function StandaloneInfoAdmin() {
  const { token } = useAuth();
  const [infoPages, setInfoPages] = useState<StandaloneInfoPage[]>([]);
  const [formData, setFormData] = useState<PageFormData>({
    name: "",
    content: "",
    description: "",
    estimatedTime: undefined,
    slug: ""
  });
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<StandaloneInfoPage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pageToDeleteId, setPageToDeleteId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      content: "",
      description: "",
      estimatedTime: undefined,
      slug: ""
    });
    setEditingPage(null);
  }, []);

  const fetchInfoPages = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.get("/problems?type=STANDALONE_INFO", token);
      setInfoPages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching info pages:", error);
      toast.error("Failed to fetch info pages");
      setInfoPages([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInfoPages();
  }, [fetchInfoPages]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'estimatedTime' ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleFormSubmit = async () => {
    if (editingPage) {
      await handleUpdatePage();
    } else {
      await handleAddPage();
    }
  };

  const handleAddPage = async () => {
    if (!token) return;

    if (!formData.name.trim() || !formData.content.trim() || !formData.slug.trim()) {
      toast.error("Name, slug, and content are required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug.trim())) {
      toast.error("Slug can only contain lowercase letters, numbers, and dashes.");
      return;
    }

    try {
      await api.post("/problems", {
        name: formData.name.trim(),
        content: formData.content.trim(),
        description: formData.description.trim(),
        estimatedTime: formData.estimatedTime,
        slug: formData.slug.trim(),
        problemType: "STANDALONE_INFO",
        difficulty: "EASY",
        required: false
      }, token);
      toast.success("Info page created successfully");
      setIsFormDialogOpen(false);
      resetForm();
      fetchInfoPages();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create info page";
      toast.error(errorMessage);
    }
  };

  const handleEditClick = (page: StandaloneInfoPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      slug: page.slug || '',
      content: page.content,
      description: page.description || '',
      estimatedTime: page.estimatedTime
    });
    setIsFormDialogOpen(true);
  };

  const handleUpdatePage = async () => {
    if (!token || !editingPage) return;

    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error("Name and content are required");
      return;
    }

    try {
      await api.put(`/problems/${editingPage.id}`, {
        name: formData.name.trim(),
        content: formData.content.trim(),
        description: formData.description.trim(),
        estimatedTime: formData.estimatedTime,
        problemType: "STANDALONE_INFO",
        difficulty: "EASY",
      }, token);
      toast.success("Info page updated successfully");
      setIsFormDialogOpen(false);
      resetForm();
      fetchInfoPages();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update info page";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (id: string) => {
    setPageToDeleteId(id);
    setIsAlertOpen(true);
  };

  const confirmDeletePage = async () => {
    if (!token || !pageToDeleteId) return;
    try {
      await api.delete(`/problems/${pageToDeleteId}`, token);
      toast.success("Info page deleted successfully");
      fetchInfoPages();
    } catch (error) {
      toast.error("Failed to delete info page");
    } finally {
      setIsAlertOpen(false);
      setPageToDeleteId(null);
    }
  };

  const filteredPages = useMemo(() => {
    if (!Array.isArray(infoPages)) return [];
    return infoPages.filter((page) =>
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [infoPages, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standalone Info Pages</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingCard />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Standalone Info Pages ({infoPages.length})</CardTitle>
              <CardDescription>Manage standalone information pages like Privacy Policy, Terms, etc.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchInfoPages} disabled={isLoading}> Refresh </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder="Search by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => {
              setIsFormDialogOpen(isOpen);
              if (!isOpen) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPage(null)}>Add Info Page</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPage ? 'Edit Info Page' : 'Create New Info Page'}</DialogTitle>
                  <DialogDescription>
                    {editingPage ? 'Update the details for this standalone information page.' : 'Add a new standalone information page to the system.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug" name="slug" value={formData.slug} onChange={handleFormChange}
                      placeholder="e.g., privacy-policy" required
                      readOnly={!!editingPage}
                      className={!!editingPage ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL-friendly identifier (lowercase, numbers, dashes). Cannot be changed after creation.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" value={formData.description} onChange={handleFormChange} />
                  </div>
                  <div>
                    <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
                    <Input
                      id="estimatedTime" name="estimatedTime" type="number" value={formData.estimatedTime || ''}
                      onChange={handleFormChange} min={1} placeholder="Leave empty for no estimate"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content (Markdown/HTML) *</Label>
                    <Textarea
                      id="content" name="content" value={formData.content} onChange={handleFormChange}
                      rows={15} required className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">* Required fields</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}> Cancel </Button>
                  <Button onClick={handleFormSubmit}>{editingPage ? 'Update Page' : 'Create Page'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {filteredPages.map((page) => (
              <Card key={page.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl">{page.name}</CardTitle>
                      <div className="text-xs font-mono text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded inline-block">
                        Slug: {page.slug || <span className="italic">Not Set</span>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Created: {new Date(page.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleEditClick(page)}
                       >
                         <Pencil className="h-4 w-4 mr-1" /> Edit
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => handleDeleteClick(page.id)}
                       >
                         <Trash2 className="h-4 w-4 mr-1" /> Delete
                       </Button>
                    </div>
                  </div>
                  {page.description && (
                    <CardDescription className="mt-2">{page.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                      Content length: {page.content?.length || 0} characters
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!isLoading && filteredPages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No info pages found matching your search. {infoPages.length > 0 ? `(${infoPages.length} total pages)` : ''}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the info page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPageToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 