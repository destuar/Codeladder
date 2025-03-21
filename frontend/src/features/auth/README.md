# Auth Feature

This directory contains the code for authentication and authorization in the CodeLadder application. The auth feature handles user login, registration, and session management.

## Directory Structure

- `AuthContext.tsx` - Context provider for authentication state and methods
- `LoginPage.tsx` - Page component for user login
- `RegisterPage.tsx` - Page component for user registration
- `OAuthCallback.tsx` - Handler for OAuth provider callbacks
- `types.ts` - Type definitions for authentication

## Main Functionality

- User authentication (login/logout)
- User registration
- Social login integration (Google, GitHub, Apple)
- JWT token management
- Session persistence
- Authorization checks

## Context API

The `AuthContext` provides:
- Current user information
- Authentication token
- Login/logout methods
- Registration method
- Social login methods
- Loading and error states

## Authentication Flow

1. Users log in via form or social provider
2. JWT tokens are received and stored
3. User profile is fetched
4. Token refresh is scheduled
5. Auth state is updated and made available via context

## Integration Points

The auth feature integrates with:
- Router - for protected routes and redirects
- Profile feature - for user profile data
- Admin feature - for role-based access control
- Backend API - for authentication endpoints

## Notes

The authentication system uses JWT (JSON Web Tokens) with refresh token rotation for security. The tokens are stored securely and refreshed automatically before expiration.

OAuth integration is provided for Google, GitHub, and Apple authentication providers, with a standardized callback mechanism to handle the OAuth flow. 