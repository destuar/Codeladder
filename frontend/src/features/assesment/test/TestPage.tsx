import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTest } from './hooks/useTest';
import { AssessmentPage } from '../shared/components/AssessmentPage';

export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
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
    forceReset,
  } = useTest(testId);

  const handleTestSubmit = async () => {
    try {
      const result = await submitTest();
      if (result && result.id) {
        navigate(`/assessment/results/${result.id}?type=test`);
      } else {
        console.error('Test submission succeeded but no attempt ID was returned.');
      }
    } catch (error) {
      console.error('Test submission failed in component:', error);
    }
  };

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
      submitAssessment={handleTestSubmit}
      forceReset={forceReset}
      locationState={location.state}
    />
  );
}
