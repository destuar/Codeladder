import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProblemList } from '@/components/ProblemList';
import { Problem } from '@/features/problems/types';
import { Skeleton } from '@/components/ui/skeleton';

// Interface for our collection type
interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  problems: Problem[];
}

export default function CollectionPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();

  // Fetch collection by slug
  const { data: collection, isLoading, error } = useQuery<Collection>({
    queryKey: ['collection', slug],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      const response = await api.get(`/collections/public/slug/${slug}`, token);
      return response;
    },
    enabled: !!token && !!slug,
  });

  const handleProblemStart = (problemId: string, problemSlug?: string) => {
    // Add query parameters for collection context
    const params = new URLSearchParams({
      from: 'collection',
      name: collection?.name || 'Collection',
      id: collection?.id || '',
      collectionSlug: collection?.slug || ''
    }).toString();

    if (problemSlug) {
      navigate(`/problem/${problemSlug}?${params}`);
    } else {
      navigate(`/problems/${problemId}?${params}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Collection Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sorry, we couldn't find the collection you're looking for.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">{collection.name}</CardTitle>
          {collection.description && (
            <CardDescription>{collection.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Problems in this Collection</h2>
          {collection.problems.length === 0 ? (
            <p className="text-muted-foreground">No problems found in this collection.</p>
          ) : (
            <ProblemList
              problems={collection.problems}
              onProblemStart={handleProblemStart}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 