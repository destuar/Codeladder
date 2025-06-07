import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";
import InfoProblem from "@/features/problems/components/info/InfoProblem";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Markdown } from '@/components/ui/markdown';
import { LoadingCard, PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/lib/logger';

type InfoPage = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export function InfoPage() {
  const { page } = useParams<{ page: string }>();
  const { token } = useAuth();
  const [infoPage, setInfoPage] = useState<InfoPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      if (!page || !token) return;

      try {
        const data = await api.get(`/problems/slug/${page}`, token);
        setInfoPage(data);
      } catch (error) {
        logger.error("Error fetching info page", error);
        toast.error("Failed to load the info page");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [page, token]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (!infoPage) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl text-muted-foreground">
          Info page not found
        </div>
      </div>
    );
  }

  // Dummy navigation handler as standalone info pages don't have next/prev
  const handleNavigate = (id: string, slug?: string) => {
    logger.warn(`Navigation attempt from InfoPage: id=${id}, slug=${slug}. Standalone pages have no sequence.`);
    // Do nothing, or potentially navigate to a default page if needed?
  };

  return (
    <InfoProblem
      content={infoPage.content}
      isCompleted={false} // Standalone info pages aren't typically 'completed'
      problemId={infoPage.id}
      title={infoPage.name}
      onNavigate={handleNavigate} // <-- Pass the dummy handler
      isStandalone={true} // Indicate it's a standalone page
    />
  );
} 