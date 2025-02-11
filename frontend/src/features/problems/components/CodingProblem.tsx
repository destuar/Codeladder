import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';

interface CodingProblemProps {
  content: string;
  codeTemplate?: string;
  testCases?: string;
}

const CodingProblem: React.FC<CodingProblemProps> = ({ 
  content, 
  codeTemplate, 
  testCases 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Problem Description Side */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Description</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <ReactMarkdown>
            {content}
          </ReactMarkdown>
        </CardContent>
      </Card>

      {/* Code Editor Side */}
      <Card>
        <CardHeader>
          <CardTitle>Code Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Code editor component will be implemented here
          </div>
          {/* Placeholder for the actual code editor component */}
        </CardContent>
      </Card>
    </div>
  );
};

export default CodingProblem; 