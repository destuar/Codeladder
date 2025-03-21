import React from 'react';
import { 
  Layers, 
  Code, 
  Brain, 
  BarChart, 
  Repeat, 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  Zap, 
  CheckCircle, 
  Clock, 
  Trophy,
  Dumbbell
} from 'lucide-react';
import { RotatingCards } from '@/components/ui/rotating-cards';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * RotatingFeatureCards component
 * 
 * Displays feature cards in a continuously rotating animation.
 * Used in the "Why CodeLadder?" section of the landing page.
 */
export function RotatingFeatureCards() {
  const features: FeatureItem[] = [
    {
      icon: <GraduationCap className="h-8 w-8 text-[#5b5bf7]" />,
      title: "Mastery-Based Learning",
      description: "Progress through clearly defined levels with leveling assessments that ensure you master each concept before advancing."
    },
    {
      icon: <Repeat className="h-8 w-8 text-[#5b5bf7]" />,
      title: "Spaced Repetition",
      description: "Strategically revisit concepts at optimal intervals to significantly improve retention and recall of critical topics."
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-[#5b5bf7]" />,
      title: "Problem-Solving Intuition",
      description: "Develop the intuitive reasoning and strategic thinking that differentiates outstanding engineers in the AI era."
    },
    {
      icon: <Code className="h-8 w-8 text-[#5b5bf7]" />,
      title: "CODE I/O Framework",
      description: "Master our 5-step approach: Clarify, Outline, Decide, Execute, Improve & Optimize for any technical challenge."
    },
    {
      icon: <Dumbbell className="h-8 w-8 text-[#5b5bf7]" />,
      title: "Future-Proof Skills",
      description: "Build algorithmic efficiency expertise that remains relevant as computational problems grow in size and complexity."
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-[#5b5bf7]" />,
      title: "Real-World Application",
      description: "Connect theoretical concepts to industry-relevant applications for deeper understanding and long-term retention."
    },
    {
      icon: <Clock className="h-8 w-8 text-[#5b5bf7]" />,
      title: "AI-Ready Preparation",
      description: "Prepare for the next generation of technical interviews that focus on conceptual understanding, not memorization."
    },
    {
      icon: <Trophy className="h-8 w-8 text-[#5b5bf7]" />,
      title: "Career Acceleration",
      description: "Develop the problem-solving skills that help engineers climb the career ladder faster in today's competitive landscape."
    }
  ];

  return <RotatingCards items={features} />;
} 