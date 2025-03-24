import React from 'react';
import { Toaster } from '@/components/ui/toaster';

interface QuizLayoutProps {
  children: React.ReactNode;
}

export function QuizLayout({ children }: QuizLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="min-h-screen">
        {children}
      </main>
      <Toaster />
    </div>
  );
} 