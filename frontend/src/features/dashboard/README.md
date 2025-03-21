# Dashboard Feature

This directory contains the code for the user dashboard in the CodeLadder application. The dashboard provides users with an overview of their progress, upcoming reviews, and learning recommendations.

## Directory Structure

- `DashboardPage.tsx` - The main dashboard page component

## Main Functionality

- Providing a personalized overview of the user's learning journey
- Displaying current progress through the curriculum
- Showing upcoming spaced repetition reviews
- Recommending next problems to solve
- Showing achievement statistics

## Key Components

The dashboard aggregates information from multiple features:
- Learning progress visualizations
- Spaced repetition review schedules
- Recent activity summaries
- Suggested next steps

## Related Components

The dashboard integrates with:
- Learning path components for progress tracking
- Spaced repetition components for review schedules
- Problem components for recommendations

## Integration Points

The dashboard feature integrates with:
- Auth feature - for user identification
- Problems feature - for problem recommendations
- Spaced repetition - for upcoming reviews
- Topics and levels - for progress tracking

## Notes

The dashboard serves as the central hub for users after logging in, providing them with a personalized view of their learning journey and actionable next steps. It is designed to motivate users by showing their progress and guiding them toward their next learning objectives. 