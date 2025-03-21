# Info Feature

This directory contains the code for the standalone information pages in the CodeLadder application. Info pages are educational content that's not directly tied to coding problems.

## Directory Structure

- `InfoPage.tsx` - The main component for displaying standalone information pages

## Main Functionality

- Displaying educational content in a user-friendly format
- Rendering markdown-based information pages
- Supporting rich media content (images, code snippets, etc.)
- Tracking user's progress through info content

## Content Format

The info pages support:
- Markdown formatting
- Code syntax highlighting
- Embedded images and diagrams
- Interactive elements

## Related Components

The info feature relies on:
- `Markdown` from `/components/ui/markdown` - For rendering content
- UI components from the shadcn/ui library

## Integration Points

The info feature integrates with:
- Problems feature - for related educational content
- Learning path - as part of the learning progression
- Spaced repetition - for reviewing information content

## Notes

Info pages serve as educational resources that can stand on their own or complement coding problems. They can be used to explain concepts, provide background information, or offer in-depth tutorials on specific topics. 

Unlike coding problems, info pages focus on knowledge consumption rather than interactive coding exercises. 