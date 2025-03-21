# Learning Feature

This directory contains the code for the learning system in the CodeLadder application. The learning feature handles the core educational structure, including levels, topics, and learning paths.

## Directory Structure

- `/components` - UI components for the learning system
  - `LevelSystem.tsx` - Component for displaying and interacting with the level structure

## Main Functionality

- Organizing content into a structured learning path
- Managing progression through learning levels
- Tracking user's learning journey
- Providing a visual representation of the curriculum

## Learning Structure

The learning system is organized hierarchically:
1. **Levels** - Broad groupings of related topics (e.g., "Fundamentals", "Intermediate")
2. **Topics** - Specific subject areas within a level (e.g., "Arrays", "Linked Lists")
3. **Problems** - Individual learning tasks within topics

## Related Components

The learning feature relies on:
- Problem components for displaying problems within topics
- UI components from the shadcn/ui library
- Navigation components for moving between levels and topics

## Integration Points

The learning feature integrates with:
- Problems feature - for the actual learning content
- Topics feature - for organizing problems
- User progress tracking - for recording completion
- Spaced repetition - for review scheduling

## Notes

The learning system is designed around the principles of mastery-based learning, where users progress through increasingly challenging material as they demonstrate proficiency. The LevelSystem component provides a visual representation of this progression, helping users understand their learning path and current position within the curriculum. 