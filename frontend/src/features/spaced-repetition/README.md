# Spaced Repetition Feature

This directory contains the code for the spaced repetition feature in the CodeLadder application. The spaced repetition system helps users retain knowledge by suggesting content for review at optimal intervals.

## Directory Structure

- `/components` - UI components for spaced repetition functionality
  - `SpacedRepetitionPanel.tsx` - Main panel for managing spaced repetition reviews
  - `ReviewControls.tsx` - Controls for submitting review results
  - `MemoryStrengthIndicator.tsx` - Visual indicator for memory strength
  - `DashboardReviewCard.tsx` - Card component for the dashboard
  - `ReviewCalendar.tsx` - Calendar view for scheduled reviews
- `/hooks` - Custom React hooks for spaced repetition logic
  - `useSpacedRepetition.ts` - Main hook for spaced repetition functionality
  - `useDashboardReviews.ts` - Hook for dashboard reviews integration
- `/api` - API integration for spaced repetition
- `index.ts` - Exports for the spaced repetition feature

## Main Functionality

- Scheduling problems for review based on memory strength
- Tracking user's memory performance over time
- Calculating optimal review intervals using spaced repetition algorithms
- Providing UI for initiating and completing reviews

## Type Definitions

The main types exported include:
- `ReviewProblem` - Problem due for review
- `ReviewResult` - Result of a user's review attempt
- `ReviewStats` - Statistics about the user's review schedule

## Integration Points

The spaced repetition feature integrates with:
- Problems feature - for reviewing problem content
- Dashboard - for showing upcoming reviews
- User profile - for storing and retrieving review history

## Notes

The spaced repetition system uses a variation of the SuperMemo algorithm to determine optimal review intervals. As users review problems, the system adjusts the intervals based on the user's self-reported confidence level during reviews. 