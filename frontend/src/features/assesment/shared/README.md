# Assessment Shared Components

This directory contains shared components, types, and utilities that are used across different assessment features, including quizzes and tests.

## Structure

- `components/`: Reusable UI components
- `types.ts`: Shared TypeScript interfaces and types

## Shared Components

### CodeQuestion

A reusable component for code assessment questions. This component renders a code editor and test cases.

```tsx
import { CodeQuestion } from '@/features/assesment/shared/components';

<CodeQuestion
  question={question}
  code={code}
  onCodeChange={handleCodeChange}
  isReview={false}
  onCompleted={() => console.log('Code completed')}
/>
```

### MultipleChoiceQuestion

A reusable component for multiple-choice questions. This component renders a list of options with selection behavior.

```tsx
import { MultipleChoiceQuestion } from '@/features/assesment/shared/components';

<MultipleChoiceQuestion
  question={question}
  selectedOption={selectedOption}
  onSelectOption={handleOptionSelect}
  isReview={false}
/>
```

### AssessmentNavigation

A navigation component that shows progress, allows navigation between questions, and includes a submit button.

```tsx
import { AssessmentNavigation } from '@/features/assesment/shared/components';

<AssessmentNavigation
  currentIndex={currentIndex}
  questions={questions}
  answers={answers}
  onNavigate={handleNavigate}
  onSubmit={handleSubmit}
  isSubmitting={isSubmitting}
  elapsedTime={elapsedTime}
  submitButtonText="Submit Quiz"
  title="Quiz Progress"
/>
```

## Shared Types

The `types.ts` file contains shared types used by both quizzes and tests. These include:

- `AssessmentQuestion`: Base interface for assessment questions
- `McProblem` and `CodeProblem`: Question type interfaces
- `McOption`: Interface for multiple-choice options
- `TestCase`: Interface for code test cases
- `McResponse` and `CodeResponse`: Response interfaces

## Extending for New Features

When adding new assessment features:

1. Extend from the existing types in `types.ts`
2. Reuse components from the `components/` directory
3. If a component needs feature-specific behavior, create a wrapper component that uses the shared component internally 