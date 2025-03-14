import React from 'react';
import { cn } from '@/lib/utils';
import './marquee.css';

interface RotatingCardsProps {
  items: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
  className?: string;
}

export function RotatingCards({ items, className }: RotatingCardsProps) {
  return (
    <div className={cn("w-full overflow-hidden py-10 rotating-cards-container relative z-20 [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]", className)}>
      <div className="relative w-full">
        {/* First row - moves right to left */}
        <div className="flex animate-marquee space-x-6 pb-8">
          {items.slice(0, Math.ceil(items.length / 2)).map((item, idx) => (
            <div
              key={`card-1-${idx}`}
              className="w-[350px] flex-shrink-0 rounded-xl border border-[#5b5bf7]/20 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#5b5bf7]/40 hover:translate-y-[-5px] dark:bg-black"
            >
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-[#5b5bf7]/10">
                <div className="text-[#5b5bf7]">
                  {item.icon}
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
          {/* Duplicate the cards for seamless looping */}
          {items.slice(0, Math.ceil(items.length / 2)).map((item, idx) => (
            <div
              key={`card-1-dup-${idx}`}
              className="w-[350px] flex-shrink-0 rounded-xl border border-[#5b5bf7]/20 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#5b5bf7]/40 hover:translate-y-[-5px] dark:bg-black"
            >
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-[#5b5bf7]/10">
                <div className="text-[#5b5bf7]">
                  {item.icon}
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Second row - moves left to right */}
        <div className="flex animate-marquee-reverse space-x-6">
          {items.slice(Math.ceil(items.length / 2)).map((item, idx) => (
            <div
              key={`card-2-${idx}`}
              className="w-[350px] flex-shrink-0 rounded-xl border border-[#5b5bf7]/20 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#5b5bf7]/40 hover:translate-y-[-5px] dark:bg-black"
            >
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-[#5b5bf7]/10">
                <div className="text-[#5b5bf7]">
                  {item.icon}
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
          {/* Duplicate the cards for seamless looping */}
          {items.slice(Math.ceil(items.length / 2)).map((item, idx) => (
            <div
              key={`card-2-dup-${idx}`}
              className="w-[350px] flex-shrink-0 rounded-xl border border-[#5b5bf7]/20 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#5b5bf7]/40 hover:translate-y-[-5px] dark:bg-black"
            >
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-[#5b5bf7]/10">
                <div className="text-[#5b5bf7]">
                  {item.icon}
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 