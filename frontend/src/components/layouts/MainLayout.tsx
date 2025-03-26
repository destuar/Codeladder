import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
} 