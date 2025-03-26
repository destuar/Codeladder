# Quiz Feature

This directory contains the quiz feature of the application, which allows users to take quizzes, view their quiz history, and see quiz results.

## Structure

- `hooks/`: Contains the `useQuiz` hook for managing quiz state
- `QuizPage.tsx`: The main quiz taking interface
- `QuizResultsPage.tsx`: Displays quiz results after completion
- `QuizHistoryPage.tsx`: Shows a history of all quiz attempts

## Shared Components

This feature uses shared components from the `../shared/components` directory:

- `CodeQuestion`: For rendering code-based quiz questions
- `MultipleChoiceQuestion`: For rendering multiple-choice quiz questions
- `AssessmentNavigation`: For navigation between quiz questions

## Extending the Quiz Feature

When adding functionality to the quiz feature:

1. Use the shared components whenever possible
2. If you need new functionality that could be shared with other assessment types (like tests), add it to the shared directory
3. Keep quiz-specific logic in this directory

## Development Notes

- The quiz feature uses the same component interfaces as other assessment types
- The `useQuiz` hook imports its types from the shared types file but exports `QuizQuestion` for convenience
- Quiz-specific interfaces that aren't shared with other assessment types are defined in the `useQuiz.ts` file 