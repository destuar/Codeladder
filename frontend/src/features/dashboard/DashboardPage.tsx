import { LevelSystem } from "@/components/LevelSystem";

export default function DashboardPage() {
  return (
    <div className="container pt-10 pb-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl flex items-center gap-2 font-semibold text-foreground">
            <div className="h-6 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
            Learning Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1 ml-3">
            Track your progress as you climb the ladder
          </p>
        </div>
      </div>

      {/* Level system */}
      <div className="w-full">
        <LevelSystem />
      </div>
    </div>
  );
} 