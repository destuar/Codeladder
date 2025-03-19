import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import type { Problem } from '@/hooks/useLearningPath';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
}

export default function ProblemsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string>("all"); // Default to all problems

  // Fetch all problems
  const { data: problems, isLoading: isLoadingProblems } = useQuery<Problem[]>({
    queryKey: ['allProblems'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/problems?includeCompletion=true', token);
      return response;
    },
    enabled: !!token,
  });

  // Fetch all collections from our new public endpoint
  const { data: collections = [], isLoading: isLoadingCollections } = useQuery<Collection[]>({
    queryKey: ['publicCollections'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get('/collections/public', token);
      return response;
    },
    enabled: !!token,
  });

  const handleProblemStart = (problemId: string) => {
    navigate(`/problems/${problemId}`);
  };

  // Handle collection change
  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollection(collectionId);
  };

  // Filter problems based on selected collection
  const filteredProblems = problems?.filter(problem => {
    // If "all" is selected, show all problems
    if (selectedCollection === 'all') {
      return true;
    }
    
    // Show problems from the selected collection
    if (problem.collectionIds && problem.collectionIds.length > 0) {
      return problem.collectionIds.includes(selectedCollection);
    }
    
    return false;
  }) || [];

  // Show loading state while either problems or collections are loading
  const isLoading = isLoadingProblems || isLoadingCollections;

  if (isLoading) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Problems</h1>
        <p className="text-muted-foreground">All available problems and info pages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem List</CardTitle>
          <CardDescription>
            Browse and practice all available problems across topics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Collection filter dropdown - always visible if collections exist */}
          {collections.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter by collection:</span>
              <Select 
                value={selectedCollection} 
                onValueChange={handleCollectionChange}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Problems</SelectItem>
                  {collections.map(collection => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredProblems.length > 0 ? (
            <ProblemList
              problems={filteredProblems}
              onProblemStart={handleProblemStart}
              itemsPerPage={50}
              showTopicName={true}
              showOrder={false}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {problems && problems.length > 0 ? 
                `No problems available in ${selectedCollection !== 'all' ? 
                  collections.find(c => c.id === selectedCollection)?.name || 'this collection' : 
                  'any collection'}` : 
                'No problems available'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 