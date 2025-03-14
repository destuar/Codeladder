import React, { ReactNode } from 'react';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

/**
 * FeatureCard component
 * 
 * Displays a feature card with a glowing effect on hover.
 * Used in the "Why CodeLadder?" section of the landing page.
 */
export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <div className={cn("relative group overflow-hidden rounded-lg", className)}>
      {/* Glowing effect positioned behind the content */}
      <GlowingEffect 
        blur={10}
        inactiveZone={0.5}
        proximity={50}
        spread={30}
        variant="default"
        disabled={false}
        movementDuration={1.5}
        borderWidth={1.5}
        className="z-0"
      />
      
      {/* Card content */}
      <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg shadow-sm border border-[#5b5bf7]/10 relative z-10 h-full transition-all duration-300 group-hover:bg-card/90">
        <div className="h-12 w-12 rounded-full bg-[#5b5bf7]/10 flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
} 