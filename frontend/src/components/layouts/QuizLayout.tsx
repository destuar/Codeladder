import React from 'react';
import { Toaster } from '@/components/ui/toaster';

interface QuizLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export function QuizLayout({ children, header }: QuizLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {header && header}
      <main className="min-h-screen">
        {children}
      </main>
      <Toaster />
    </div>
  );
} 