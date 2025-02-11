import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";

interface InfoProblemProps {
  content: string;
}

const InfoProblem: React.FC<InfoProblemProps> = ({ content }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <Markdown content={content} />
      </CardContent>
    </Card>
  );
};

export default InfoProblem; 