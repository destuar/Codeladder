import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

type SearchResult = {
  id: string;
  name: string;
  description: string | null;
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const data = await api.get(`/standalone-info?search=${encodeURIComponent(searchQuery.trim())}`, token);
        if (Array.isArray(data)) {
          setResults(data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, token]);

  const handleResultClick = (id: string) => {
    navigate(`/info/${id}`);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          placeholder="Search info pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        {isSearching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <Card className="absolute top-full mt-1 w-full z-50">
          <CardContent className="p-2">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.id)}
                  className="block w-full text-left p-2 hover:bg-muted rounded-md"
                >
                  <div className="font-medium">{result.name}</div>
                  {result.description && (
                    <div className="text-sm text-muted-foreground">{result.description}</div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 