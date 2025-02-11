import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';

interface InfoProblemProps {
  content: string;
}

const InfoProblem: React.FC<InfoProblemProps> = ({ content }) => {
  return (
    <Card>
      <CardContent className="p-6 prose dark:prose-invert max-w-none">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
};

export default InfoProblem; 