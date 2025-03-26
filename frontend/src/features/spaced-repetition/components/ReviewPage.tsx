import { useState, useEffect } from 'react';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SpacedRepetitionPanel } from './SpacedRepetitionPanel';

/**
 * Dedicated page for spaced repetition reviews
 * This will be the main page accessed from the Review tab
 */
export function ReviewPage() {
  const {
    dueReviews,
    stats,
    isLoading
  } = useSpacedRepetition();

  return (
    <div className="container py-8">
      <div className="grid gap-6">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <SpacedRepetitionPanel />
        )}
      </div>
    </div>
  );
} 