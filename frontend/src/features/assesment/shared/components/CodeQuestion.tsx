import React from 'react';
import { AssessmentQuestion, TestResult } from '../types';
import CodingProblem from '@/features/problems/components/coding/CodingProblem';

interface CodeQuestionProps {
  question: AssessmentQuestion;
  code?: string;
  onCodeChange: (code: string) => void;
  isReview?: boolean;
  testResults?: TestResult[];
  onCompleted?: () => void;
}

export function CodeQuestion({
  question,
  code,
  onCodeChange,
  isReview = false,
  testResults,
  onCompleted = () => {}
}: CodeQuestionProps) {
  if (!question.codeProblem) {
    return <div className="text-destructive">Error: Not a code question</div>;
  }

  const { codeTemplate, testCases, language } = question.codeProblem;
  
  // Format test cases from assessment format to problem format
  const formattedTestCases = JSON.stringify(testCases);

  // Mock navigation function - not used in quiz/test mode but required by component
  const handleNavigate = () => {}; 

  // Adapt the assessment question to the CodingProblem format
  return (
    <div className="h-full flex flex-col">
      <CodingProblem
        title={question.questionText}
        content={question.questionText}
        codeTemplate={code || codeTemplate || ''}
        testCases={formattedTestCases}
        difficulty={question.difficulty || "MEDIUM"} // Use question difficulty or default to MEDIUM
        problemId={question.id}
        isReviewMode={isReview}
        onCodeChange={onCodeChange}
        onCompleted={onCompleted}
        isQuizMode={true} // This is true for both quizzes and tests as they share the same UI behavior
        onNavigate={handleNavigate} // Add the required prop
      />
    </div>
  );
} 