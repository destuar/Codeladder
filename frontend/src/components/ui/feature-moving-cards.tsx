"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import "./feature-cards.css";

export const FeatureMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
    icon: React.ReactNode;
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);

  useEffect(() => {
    addAnimation();
  }, []);
  
  const [start, setStart] = useState(false);
  
  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }
  
  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards"
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse"
        );
      }
    }
  };
  
  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  };
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-6 py-4 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{ 
          transform: "translateX(0)",
          width: "fit-content"
        }}
      >
        {items.map((item, idx) => (
          <li
            className="w-[350px] max-w-full relative rounded-xl border border-[#5b5bf7]/20 bg-white dark:bg-black shadow-lg shrink-0 px-6 py-6 md:w-[380px] transition-all duration-300 hover:shadow-xl hover:border-[#5b5bf7]/40"
            key={`${item.name}-${idx}`}
          >
            <div className="flex flex-col h-full">
              <div className="mb-4">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {item.name}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.quote}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 