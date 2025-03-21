# Profile Feature

This directory contains the code for the user profile feature in the CodeLadder application. The profile feature enables users to view and edit their account information.

## Directory Structure

- `ProfileContext.tsx` - Context provider for profile data and operations
- `ProfilePage.tsx` - The main profile page component

## Main Functionality

- Displaying user profile information
- Updating personal details (name, email, etc.)
- Managing account settings and preferences
- Viewing user progress statistics
- Integration with authentication

## Context API

The `ProfileContext` provides:
- User profile data
- Methods to update profile information
- Profile state management

## Related Components

The profile feature relies on:
- Authentication components from the auth feature
- UI components from the shadcn/ui library

## Integration Points

The profile feature integrates with:
- Auth feature - for authentication and user identity
- Learning path - for displaying user progress
- Spaced repetition - for reviewing learning history
- Backend API - for storing and retrieving user profile data

## Notes

The profile feature follows a context-based pattern, where profile data is made available throughout the application via the React Context API. This allows components to access and update profile information without prop drilling. 