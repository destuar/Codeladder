import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTest } from './hooks/useTest';
import { AssessmentPage } from '../shared/components/AssessmentPage';

export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const location = useLocation();
  
  const {
    test,
    currentQuestionIndex,
    answers,
    isLoading,
    error,
    isSubmitting,
    goToQuestion,
    saveAnswer,
    submitTest,
    startTestAttempt,
    forceReset,
  } = useTest(testId);

  return (
    <AssessmentPage
      type="test"
      id={testId || ''}
      assessment={test}
      currentQuestionIndex={currentQuestionIndex}
      answers={answers}
      isLoading={isLoading}
      error={error}
      isSubmitting={isSubmitting}
      goToQuestion={goToQuestion}
      saveAnswer={saveAnswer}
      submitAssessment={submitTest}
      startAttempt={startTestAttempt}
      forceReset={forceReset}
      locationState={location.state}
    />
  );
}
