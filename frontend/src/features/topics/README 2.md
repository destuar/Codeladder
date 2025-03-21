# Topics Feature

This directory contains the code for the topics feature in the CodeLadder application. Topics are collections of related problems that users can work through as part of their learning path.

## Directory Structure

- `TopicPage.tsx` - The main page component for displaying a specific topic and its problems

## Main Functionality

- Displaying topic content and description
- Showing a list of problems within a topic
- Tracking completion status of topic problems
- Integration with learning paths and levels

## Type Definitions

The topics feature primarily uses types from the learning path system:
- `Topic` - Represents a topic with its metadata and problems
- `Problem` - Problems that belong to a topic
- `Level` - The level that contains the topic

## Related Components

The topics feature relies on several shared components:
- `ProblemList` from `/components/ProblemList.tsx` - For displaying the problems in a topic
- `Markdown` from `/components/ui/markdown` - For rendering topic content

## Notes

Topics are organized hierarchically as part of a learning path:
- Levels contain topics
- Topics contain problems

The TopicPage component provides a view of a single topic's content and problems, with options to navigate to individual problems. 