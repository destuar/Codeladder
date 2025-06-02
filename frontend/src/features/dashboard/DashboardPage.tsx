import { LevelSystem } from "@/components/LevelSystem";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function DashboardPage() {
  const isMobile = useMediaQuery("(max-width: 767px)"); // md breakpoint is 768px, so mobile is below that

  return (
    <div className="container pt-8 pb-8 space-y-6 font-mono max-w-7xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-4 text-center text-foreground">
          {isMobile ? "Learning Dashboard" : "The Learning Dashboard"}
        </h1>
        <p className="text-center text-muted-foreground">
          Track your progress as you climb.
        </p>
      </div>

      {/* Level system */}
      <div className="w-full">
        <LevelSystem />
      </div>
    </div>
  );
} 