import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Admin component for managing problems in the Problem List collection (placeholder)
 */
export function ProblemListAdmin() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Problem List Editor</CardTitle>
          <CardDescription>
            Manage problems in the Problem List collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              This feature is coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 