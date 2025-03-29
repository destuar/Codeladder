import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useQuiz } from './hooks/useQuiz';
import { AssessmentPage } from '../shared/components/AssessmentPage';

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const location = useLocation();
  
  const {
    quiz,
    currentQuestionIndex,
    answers,
    isLoading,
    error,
    isSubmitting,
    goToQuestion,
    saveAnswer,
    submitQuiz,
    startQuizAttempt,
    forceReset,
  } = useQuiz(quizId);

  return (
    <AssessmentPage
      type="quiz"
      id={quizId || ''}
      assessment={quiz}
      currentQuestionIndex={currentQuestionIndex}
      answers={answers}
      isLoading={isLoading}
      error={error}
      isSubmitting={isSubmitting}
      goToQuestion={goToQuestion}
      saveAnswer={saveAnswer}
      submitAssessment={submitQuiz}
      startAttempt={startQuizAttempt}
      forceReset={forceReset}
      locationState={location.state}
    />
  );
}
