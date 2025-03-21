import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, HelpCircle, Brain } from 'lucide-react';
import { ReviewResult } from '../api/spacedRepetitionApi';

interface ReviewControlsProps {
  problemId: string;
  onSubmitReview: (result: ReviewResult) => void;
}

/**
 * Component that displays controls for submitting a review result
 */
export function ReviewControls({ problemId, onSubmitReview }: ReviewControlsProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleReviewResult = async (wasSuccessful: boolean) => {
    setIsSubmitting(true);
    
    try {
      await onSubmitReview({ problemId, wasSuccessful });
      navigate('/problems');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="mt-6 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>Review Mode</span>
        </CardTitle>
        <CardDescription>
          Rate how well you remembered this problem to optimize your learning schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="border-red-500 hover:bg-red-500/10 text-red-500 gap-2"
            onClick={() => handleReviewResult(false)}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
            <span>Forgot</span>
          </Button>
          <Button 
            variant="outline"
            className="border-amber-500 hover:bg-amber-500/10 text-amber-500 gap-2"
            onClick={() => handleReviewResult(true)}
            disabled={isSubmitting}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Remembered with Difficulty</span>
          </Button>
          <Button 
            variant="outline"
            className="border-green-500 hover:bg-green-500/10 text-green-500 gap-2"
            onClick={() => handleReviewResult(true)}
            disabled={isSubmitting}
          >
            <Check className="h-4 w-4" />
            <span>Remembered Easily</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 