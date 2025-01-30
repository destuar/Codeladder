import { LevelSystem } from "@/components/LevelSystem";

export default function DashboardPage() {
  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Track your learning progress</p>
        </div>
      </div>

      <div className="grid gap-8">
        <LevelSystem />
      </div>
    </div>
  );
} 