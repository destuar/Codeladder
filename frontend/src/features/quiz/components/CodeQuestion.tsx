import React from 'react';
import { QuizQuestion } from '../hooks/useQuiz';
import CodingProblem from '@/features/problems/components/coding/CodingProblem';

interface CodeQuestionProps {
  question: QuizQuestion;
  code?: string;
  onCodeChange: (code: string) => void;
  isReview?: boolean;
  testResults?: Array<{
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput?: string;
    error?: string;
  }>;
}

export function CodeQuestion({
  question,
  code,
  onCodeChange,
  isReview = false,
  testResults
}: CodeQuestionProps) {
  if (!question.codeProblem) {
    return <div className="text-destructive">Error: Not a code question</div>;
  }

  const { codeTemplate, testCases, language } = question.codeProblem;
  
  // Format test cases from quiz format to problem format
  const formattedTestCases = JSON.stringify(testCases);
  
  // Convert test results if in review mode
  const onCompleted = () => {
    // In quiz mode, completion is handled by the quiz flow
  };

  // Adapt the quiz question to the CodingProblem format
  return (
    <div className="h-full flex flex-col">
      <CodingProblem
        title={question.questionText}
        content={question.questionText}
        codeTemplate={code || codeTemplate || ''}
        testCases={formattedTestCases}
        difficulty="MEDIUM" // Default difficulty
        problemId={question.id}
        isReviewMode={isReview}
        onCodeChange={onCodeChange}
        onCompleted={onCompleted}
        isQuizMode={true}
      />
    </div>
  );
}
