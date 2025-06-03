import { useState, useEffect } from 'react';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SpacedRepetitionPanel } from './SpacedRepetitionPanel';
import { LoadingCard } from '@/components/ui/loading-spinner';

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
    <div className="font-mono relative bg-background min-h-screen">
      <div className="absolute inset-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 relative z-10">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <LoadingCard />
            </CardContent>
          </Card>
        ) : (
          <SpacedRepetitionPanel />
        )}
      </div>
    </div>
  );
} 