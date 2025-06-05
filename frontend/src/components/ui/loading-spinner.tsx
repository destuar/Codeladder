import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  centered?: boolean;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4', 
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8'
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
};

/**
 * Standardized loading spinner component for consistent loading states across the application.
 * 
 * @param size - Size variant of the spinner (xs, sm, md, lg, xl)
 * @param className - Additional CSS classes to apply
 * @param text - Optional loading text to display alongside the spinner
 * @param centered - Whether to center the spinner and text
 */
export function LoadingSpinner({ 
  size = 'md', 
  className, 
  text, 
  centered = false 
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <Loader2 
      className={cn(
        sizeClasses[size], 
        'animate-spin text-primary font-sans',
        className
      )} 
    />
  );

  if (text) {
    return (
      <div className={cn(
        'flex items-center gap-2',
        centered && 'justify-center',
        className
      )}>
        {spinnerElement}
        <span className={cn(
          'text-muted-foreground font-sans',
          textSizeClasses[size]
        )}>
          {text}
        </span>
      </div>
    );
  }

  if (centered) {
    return (
      <div className={cn('flex justify-center items-center', className)}>
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
}

/**
 * Pre-configured loading spinner for full-screen loading states
 */
export function LoadingScreen({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <LoadingSpinner size="lg" text={text} centered />
    </div>
  );
}

/**
 * Pre-configured loading spinner for card/section loading states
 */
export function LoadingCard({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8 font-sans">
      <LoadingSpinner size="md" text={text} centered />
    </div>
  );
}

/**
 * Pre-configured loading spinner for button loading states
 */
export function LoadingButton({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  return <LoadingSpinner size={size} />;
}

/**
 * Primitive for the custom CSS page loader.
 */
function CustomCssPageLoaderPrimitive({ className }: { className?: string }) {
  return <div className={cn("new-custom-page-loader", className)}></div>;
}

/**
 * Standardized page loading spinner using custom CSS: large size, centered, no text.
 */
export function PageLoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center items-center', className)}>
      <CustomCssPageLoaderPrimitive />
    </div>
  );
} 