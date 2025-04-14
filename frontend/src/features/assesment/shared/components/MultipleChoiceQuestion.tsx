import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { AssessmentQuestion } from '../types';

interface MultipleChoiceQuestionProps {
  question: AssessmentQuestion;
  selectedOption?: string;
  onSelectOption: (optionId: string) => void;
  isReview?: boolean;
}

function MultipleChoiceQuestionComponent({
  question,
  selectedOption,
  onSelectOption,
  isReview = false
}: MultipleChoiceQuestionProps) {
  if (!question.mcProblem) {
    return <div className="text-destructive">Error: Not a multiple choice question</div>;
  }

  const { options, shuffleOptions, explanation } = question.mcProblem;
  
  // For debugging - log when the component renders with its props
  React.useEffect(() => {
    if (selectedOption) {
      console.log(`MCQ for question ${question.id} rendering with selectedOption: ${selectedOption}`);
      
      // Verify the option exists in the available options
      const optionExists = options.some(opt => opt.id === selectedOption);
      if (!optionExists) {
        console.warn(`Warning: Selected option ${selectedOption} not found in available options for question ${question.id}`);
      }
    }
  }, [question.id, selectedOption, options]);
  
  // If shuffleOptions is true and we're not in review mode, shuffle the options
  const displayOptions = React.useMemo(() => {
    if (!isReview && shuffleOptions) {
      return [...options].sort(() => Math.random() - 0.5);
    }
    return options;
  }, [options, shuffleOptions, isReview]);

  // Use callback to prevent re-renders
  const handleOptionSelect = React.useCallback((optionId: string) => {
    if (!isReview) {
      // Only trigger if this is actually a change to avoid unnecessary re-renders
      if (optionId !== selectedOption) {
        console.log(`MCQ: selecting option ${optionId} for question ${question.id}`);
        onSelectOption(optionId);
      }
    }
  }, [isReview, onSelectOption, selectedOption, question.id]);

  return (
    <div className="flex items-start justify-center w-full h-full p-4">
      <div className="max-w-3xl w-full">
        <div className="text-2xl font-medium mb-8">{question.questionText}</div>
        
        <div className="space-y-3">
          {displayOptions.map((option, index) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = isReview && option.isCorrect;
            const isIncorrect = isReview && isSelected && !option.isCorrect;
            
            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-md border cursor-pointer transition-all",
                  isSelected && !isReview ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground hover:bg-slate-50",
                  isCorrect ? "border-green-500 bg-green-50" : "",
                  isIncorrect ? "border-red-500 bg-red-50" : ""
                )}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  isSelected ? "border-primary" : "border-muted-foreground/40",
                  isCorrect ? "border-green-500" : "",
                  isIncorrect ? "border-red-500" : ""
                )}>
                  {isSelected && (
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      isCorrect ? "bg-green-500" : (isIncorrect ? "bg-red-500" : "bg-primary")
                    )} />
                  )}
                </div>
                
                <span className={cn(
                  "flex-1 text-base",
                  isSelected && !isReview ? "font-medium" : "",
                  isCorrect ? "text-green-700" : "",
                  isIncorrect ? "text-red-700" : ""
                )}>
                  {option.optionText}
                </span>
                
                {/* Number indicator for keyboard shortcut */}
                {!isReview && index < 9 && (
                  <div className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded">
                    {index + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* General question explanation shown in review mode */}
        {isReview && explanation && (
          <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
            <div className="font-medium mb-1">Explanation:</div>
            <div>{explanation}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export a memoized version of the component
export const MultipleChoiceQuestion = memo(MultipleChoiceQuestionComponent); 