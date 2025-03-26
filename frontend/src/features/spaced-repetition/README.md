# Spaced Repetition Feature

This directory contains the code for the spaced repetition feature in the CodeLadder application. The spaced repetition system helps users retain knowledge by suggesting content for review at optimal intervals.

## Directory Structure

- `/components` - UI components for spaced repetition functionality
  - `SpacedRepetitionPanel.tsx` - Main panel for managing spaced repetition reviews
  - `ReviewControls.tsx` - Controls for submitting review results
  - `MemoryStrengthIndicator.tsx` - Visual indicator for memory strength
  - `ReviewCalendar.tsx` - Calendar view for scheduled reviews
- `/hooks` - Custom React hooks for spaced repetition logic
  - `useSpacedRepetition.ts` - Main hook for spaced repetition functionality
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

## Memory Strengthening Visualization

The system includes several visual components to help users understand how their memory is strengthening over time:

### 1. Memory Strength Indicator

The `MemoryStrengthIndicator` component visualizes the current memory strength level:

- Shows a progress bar that fills based on the review level (0-7)
- Changes color as memory strength increases (blue → indigo → violet → purple)
- Animates when the level changes to provide immediate feedback
- Shows level changes with up/down indicators
- Provides a detailed tooltip with retention predictions and next review date

### 2. Memory Progression Journey

The `MemoryProgressionJourney` component shows a detailed view of the user's learning journey:

- Displays a timeline of all review attempts
- Charts memory strength progression over time
- Shows success rate and predicted retention percentage
- Provides details about each review session
- Explains how memory strengthening works through spaced repetition

### 3. Review Feedback Animation

The `ReviewControls` component provides immediate visual feedback after each review:

- Shows animation of memory strength increasing/decreasing
- Explicitly displays level changes
- Provides encouraging messages based on performance
- Explains what happens next in the learning process

### 4. Educational Content

The system includes educational content about how memory works:

- Explains the forgetting curve and how spaced repetition counteracts it
- Provides visualization of memory retention over time
- Shows how increasing intervals optimize learning efficiency
- Offers tips for effective study and review practices

## How Memory Strengthening Works

1. **Initial Learning**: When a user first completes a problem, it starts at level 0.

2. **Review Process**: During reviews, users self-assess their recall:
   - "I remembered easily" → Level increases by 1, longer interval before next review
   - "I remembered with difficulty" → Level increases by 1, longer interval
   - "I forgot this one" → Level decreases by 1, shorter interval

3. **Interval Scheduling**: The system uses Fibonacci-based spacing:
   - Level 0: Review in 1 day (25% retention)
   - Level 1: Review in 1 day (40% retention)
   - Level 2: Review in 2 days (60% retention)
   - Level 3: Review in 3 days (70% retention)
   - Level 4: Review in 5 days (80% retention)
   - Level 5: Review in 8 days (85% retention)
   - Level 6: Review in 13 days (90% retention)
   - Level 7: Review in 21 days (95% retention)

4. **Long-Term Retention**: Problems at level 7 are considered mastered and moved to long-term memory, with minimal review required.

## Benefits of This Approach

- **Transparency**: Users understand exactly how their memory is improving
- **Motivation**: Visual feedback celebrates progress and encourages consistent review
- **Education**: Users learn about effective learning techniques while using the system
- **Optimization**: The spaced intervals are scientifically optimized for efficient learning

## Components

- `MemoryStrengthIndicator`: Shows current memory strength level
- `MemoryProgressionJourney`: Visualizes memory progression over time
- `ReviewControls`: Interface for submitting review feedback
- `SpacedRepetitionPanel`: Main panel for managing due reviews
- `ReviewCalendar`: Calendar view showing scheduled reviews
- `AllScheduledReviews`: List view of all upcoming reviews 