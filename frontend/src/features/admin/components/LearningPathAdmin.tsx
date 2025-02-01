import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLearningPath } from "@/hooks/useLearningPath";

export function LearningPathAdmin() {
  const { levels, loading, error } = useLearningPath();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Learning Path Management</h2>
          <p className="text-muted-foreground">Manage levels, topics, and problems</p>
        </div>
        <Button>Add New Level</Button>
      </div>

      <div className="grid gap-6">
        {levels.map((level) => (
          <Card key={level.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-2xl">Level {level.name}</CardTitle>
                <CardDescription>{level.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Edit Level</Button>
                <Button variant="outline" size="sm">Add Topic</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {level.topics.map((topic) => (
                  <Card key={topic.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle>{topic.name}</CardTitle>
                        <CardDescription>{topic.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit Topic</Button>
                        <Button variant="outline" size="sm">Add Problem</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {topic.problems.map((problem) => (
                          <div key={problem.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <div className="font-medium">{problem.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {problem.difficulty} • {problem.required ? `Required (${problem.reqOrder})` : 'Optional'}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 