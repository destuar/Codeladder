import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";

type InfoPage = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export function InfoPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [page, setPage] = useState<InfoPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      if (!id || !token) return;

      try {
        const data = await api.get(`/standalone-info/${id}`, token);
        setPage(data);
      } catch (error) {
        console.error("Error fetching info page:", error);
        toast.error("Failed to load the info page");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-xl text-muted-foreground">
          Info page not found
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative">
      <div className="flex-1 overflow-auto px-4 md:px-8">
        <div className="py-4">
          {/* Title and description */}
          <div className="max-w-4xl mx-auto mb-6">
            <h1 className="text-3xl font-bold mb-2">{page.name}</h1>
            {page.description && (
              <p className="text-lg text-muted-foreground">{page.description}</p>
            )}
          </div>

          {/* Reading time indicator */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4 max-w-4xl mx-auto">
            <Timer className="w-4 h-4" />
            <span>Last updated: {new Date(page.updatedAt).toLocaleDateString()}</span>
          </div>

          {/* Main content */}
          <div className="max-w-4xl mx-auto overflow-hidden">
            {isMarkdown(page.content) ? (
              // For backward compatibility, use Markdown for existing markdown content
              <div className="prose dark:prose-invert prose-a:text-primary prose-a:font-semibold hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline max-w-full overflow-hidden">
                <Markdown 
                  content={page.content} 
                  className="max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words"
                />
              </div>
            ) : (
              // Use HtmlContent for HTML content
              <HtmlContent 
                content={page.content} 
                className="prose-a:text-primary prose-a:font-semibold hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 