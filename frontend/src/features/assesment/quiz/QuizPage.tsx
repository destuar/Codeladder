import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuiz } from './hooks/useQuiz';
import { AssessmentPage } from '../shared/components/AssessmentPage';

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
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
    forceReset,
  } = useQuiz(quizId);

  const handleQuizSubmit = async () => {
    try {
      const result = await submitQuiz();
      if (result && result.id) {
        navigate(`/assessment/results/${result.id}?type=quiz`);
      } else {
        console.error('Quiz submission succeeded but no attempt ID was returned.');
      }
    } catch (error) {
      console.error('Quiz submission failed in component:', error);
    }
  };

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
      submitAssessment={handleQuizSubmit}
      forceReset={forceReset}
      locationState={location.state}
    />
  );
}
