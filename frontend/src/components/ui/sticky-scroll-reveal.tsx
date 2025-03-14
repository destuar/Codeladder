"use client";
import React, { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const StickyScroll = ({
  content,
  contentClassName,
  onActiveCardChange,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string;
  onActiveCardChange?: (index: number) => void;
}) => {
  const [activeCard, setActiveCard] = React.useState(0);
  const ref = useRef<any>(null);
  const { scrollYProgress } = useScroll({
    // uncomment line 22 and comment line 23 if you DONT want the overflow container and want to have it change on the entire page scroll
    // target: ref
    container: ref,
    offset: ["start start", "end start"],
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
    
    // Call the onActiveCardChange callback if provided
    if (onActiveCardChange && closestBreakpointIndex !== activeCard) {
      onActiveCardChange(closestBreakpointIndex);
    }
  });

  // More subtle background colors that match the main page theme
  const backgroundColors = [
    "hsl(var(--background))",
    "hsl(var(--background))",
    "hsl(var(--background))",
  ];
  
  // Enhanced accent colors for the content background
  const accentColors = [
    "linear-gradient(to bottom right, rgba(91, 91, 247, 0.05), rgba(122, 122, 255, 0.05))",
    "linear-gradient(to bottom right, rgba(91, 91, 247, 0.08), rgba(122, 122, 255, 0.08))",
    "linear-gradient(to bottom right, rgba(91, 91, 247, 0.05), rgba(122, 122, 255, 0.05))",
  ];

  const [accentGradient, setAccentGradient] = useState(accentColors[0]);

  useEffect(() => {
    setAccentGradient(accentColors[activeCard % accentColors.length]);
  }, [activeCard]);

  return (
    <motion.div
      animate={{
        backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="h-[30rem] overflow-y-auto flex justify-center relative space-x-10 rounded-md p-10 scrollbar-thin scrollbar-thumb-[#5b5bf7]/20 scrollbar-track-transparent"
      ref={ref}
    >
      <div className="div relative flex items-start px-4">
        <div className="max-w-2xl">
          {content.map((item, index) => (
            <div key={item.title + index} className="my-20">
              <motion.h2
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                  scale: activeCard === index ? 1 : 0.98,
                  y: activeCard === index ? 0 : 5,
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                }}
                className="text-2xl font-bold text-foreground"
              >
                {item.title}
              </motion.h2>
              <motion.p
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                  scale: activeCard === index ? 1 : 0.98,
                  y: activeCard === index ? 0 : 5,
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                  delay: 0.1,
                }}
                className="text-kg text-muted-foreground max-w-sm mt-10"
              >
                {item.description}
              </motion.p>
            </div>
          ))}
          <div className="h-40" />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          background: accentGradient 
        }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
        }}
        className={cn(
          "hidden lg:block rounded-xl bg-background border border-[#5b5bf7]/10 sticky top-10 overflow-hidden shadow-md transition-all duration-500",
          contentClassName
        )}
      >
        {/* Subtle border glow effect */}
        <div className="absolute inset-0 rounded-xl border border-[#5b5bf7]/20 opacity-50"></div>
        
        {/* Content */}
        <motion.div 
          key={activeCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 h-full"
        >
          {content[activeCard].content ?? null}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
