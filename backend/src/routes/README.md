# CodeLadder Spaced Repetition System

This directory contains the backend routes for the CodeLadder spaced repetition system, which helps users retain knowledge by reviewing completed problems at strategic intervals.

## Implementation

File: `spacedRepetition.ts`
API Path: `/api/spaced-repetition/`

This implementation uses problem slugs in URLs, providing a clean and user-friendly experience.

## Key Features

1. **Slug-based URLs**: Clean, readable URLs using the problem slug instead of ID
2. **Flexible Identification**: Can identify problems by either slug or ID, with slug preferred
3. **Robust Error Handling**: Detailed error messages and graceful failure modes
4. **Enhanced Response Format**: Includes additional metadata in responses (like problem slug)
5. **Efficient Problem Resolution**: Dedicated utilities for resolving problems by either ID or slug

## API Endpoints

The system provides the following endpoints:

- `GET /due` - Get problems due for review
- `GET /all-scheduled` - Get all scheduled reviews with categorization
- `POST /review` - Record a problem review result
- `GET /stats` - Get spaced repetition statistics
- `DELETE /remove-problem/:identifier` - Remove a problem from spaced repetition
- `POST /add-to-repetition` - Add a completed problem to spaced repetition
- `GET /available-problems` - Get completed problems not already in spaced repetition

## Key Files

- `spacedRepetition.ts` - Main routes
- `../lib/spacedRepetition.ts` - Core algorithm implementation
- `../lib/problemResolver.ts` - Utilities for resolving problems by ID or slug

## Migration Note

To ensure all problems have slugs, run:
`backend/src/scripts/populateProblemSlugs.ts`

## Frontend Usage

Import and use the hook:
```typescript
import { useSpacedRepetition } from '@/features/spaced-repetition';
``` 