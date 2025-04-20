import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QuizResultsPage } from '../quiz/QuizResultsPage';
import { TestResultsPage } from '../test/TestResultsPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizLayout } from '@/components/layouts/QuizLayout';

/**
 * This component serves as a router to redirect to the appropriate results page
 * based on the assessment type provided in the query parameters.
 */
export function AssessmentResultsRouter() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract the assessment type from query parameters
  const searchParams = new URLSearchParams(location.search);
  const assessmentType = searchParams.get('type')?.toLowerCase() || '';
  
  useEffect(() => {
    console.log(`AssessmentResultsRouter: type=${assessmentType}, attemptId=${attemptId}`);
    
    // Get all query parameters for forwarding
    const queryParams = location.search;
    
    // Optional: Redirect to legacy routes for backward compatibility
    if (assessmentType === 'quiz') {
      console.log('Redirecting to quiz results page');
      navigate(`/quizzes/attempts/${attemptId}/results${queryParams}`, { replace: true });
    } else if (assessmentType === 'test') {
      console.log('Redirecting to test results page');  
      navigate(`/tests/attempts/${attemptId}/results${queryParams}`, { replace: true });
    }
  }, [assessmentType, attemptId, navigate, location.search]);
  
  // Render the appropriate page based on the assessment type
  if (assessmentType === 'quiz') {
    return <QuizResultsPage />;
  } else if (assessmentType === 'test') {
    return <TestResultsPage />;
  }
  
  // If no valid assessment type was provided, show an error
  return (
    <QuizLayout>
      <div className="container py-8 max-w-6xl">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Assessment Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Unable to determine the assessment type. Please specify a valid assessment type.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </QuizLayout>
  );
} 