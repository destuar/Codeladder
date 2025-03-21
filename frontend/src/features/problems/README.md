# Problems Feature

This directory contains the code for the problems feature in the CodeLadder application.

## Directory Structure

- `/components` - Reusable UI components specific to the problems feature
- `/hooks` - Custom React hooks for problems-related functionality
- `/types` - Type definitions for the problems feature
- `/utils` - Utility functions for problems

## Main Files

- `ProblemsPage.tsx` - The main page that displays all problems
- `ProblemPage.tsx` - The individual problem view page

## Type Definitions

All type definitions for the problems feature are consolidated in `/types/index.ts`. These include:

- `Problem` - The main Problem interface
- `Difficulty` - Enum for problem difficulty levels
- `ProblemType` - Enum for problem types (INFO, CODING, STANDALONE_INFO)
- Other type definitions for components and utilities

## Recent Cleanup (2023-06-10)

The following cleanup tasks were performed to reduce duplication and improve code organization:

1. Consolidated all type definitions in `/types/index.ts`
2. Removed empty placeholder files in `/pages` directory
3. Updated components to use the consolidated types
4. Removed duplicate ProblemList component

## Notes

The global `ProblemList` component in `/components/ProblemList.tsx` is the primary implementation used across the application. It uses type definitions from the problems feature.

## Related Components

Some global components are used extensively with the problems feature:

- `ProblemList` from `/components/ProblemList.tsx`
- `SpacedRepetitionPanel` from the spaced-repetition feature 