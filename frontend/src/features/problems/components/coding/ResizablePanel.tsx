import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { ResizablePanelProps } from '../../types/coding';

const DOUBLE_CLICK_TIMEOUT = 300;
const COLLAPSED_WIDTH = 0;

/**
 * A resizable panel component with collapse/expand functionality
 */
export function ResizablePanel({
  defaultWidth,
  minWidth,
  maxWidth,
  children,
  onResize,
  className,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Handle double click to collapse/expand
  const handleDoubleClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setWidth(startWidth || defaultWidth);
    } else {
      setStartWidth(width);
      setIsCollapsed(true);
      setWidth(COLLAPSED_WIDTH);
    }
    onResize?.(isCollapsed ? (startWidth || defaultWidth) : COLLAPSED_WIDTH);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(width);
    
    // Handle double click
    const clickTime = new Date().getTime();
    if (clickTime - lastClickTime < DOUBLE_CLICK_TIMEOUT) {
      handleDoubleClick();
    }
    setLastClickTime(clickTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(
        minWidth,
        Math.min(startWidth + diff, maxWidth)
      );
      setWidth(newWidth);
      onResize?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startX, startWidth, minWidth, maxWidth, onResize]);

  return (
    <div 
      style={{ 
        width: width,
        transition: isDragging ? 'none' : 'width 0.3s ease-in-out'
      }} 
      className={cn("flex-none relative", className)}
    >
      {children}
      
      {/* Resize handle */}
      <div
        ref={dragHandleRef}
        className={cn(
          "absolute top-0 right-0 w-2 h-full -mr-1",
          "cursor-ew-resize hover:bg-border/50 z-50",
          isDragging && "bg-border/50"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
          <div className={cn(
            "h-16 rounded-sm flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isDragging && "opacity-100"
          )}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Collapse/Expand button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 -right-8",
            "opacity-0 group-hover:opacity-100",
            "transition-all duration-200",
            "h-6 w-6"
          )}
          onClick={handleDoubleClick}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
} 