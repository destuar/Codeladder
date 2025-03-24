import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";
import InfoProblem from "@/features/problems/components/info/InfoProblem";

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
        const data = await api.get(`/standalone-info/${page}`, token);
        setInfoPage(data);
      } catch (error) {
        console.error("Error fetching info page:", error);
        toast.error("Failed to load the info page");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [page, token]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  return (
    <InfoProblem
      content={infoPage.content}
      isCompleted={false}
      problemId={infoPage.id}
      title={infoPage.name}
    />
  );
} 