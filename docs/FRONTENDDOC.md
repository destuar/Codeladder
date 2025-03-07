# Frontend Documentation

This document provides a comprehensive overview of the frontend codebase structure, components, and functionality.

## Project Overview

The frontend is a React-based single-page application built with modern web technologies. It follows a feature-based architecture with reusable UI components.

### Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **State Management**: React Context API and React Query
- **Styling**: Tailwind CSS with shadcn/ui components
- **Form Handling**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Code Quality**: ESLint, TypeScript

## Directory Structure

```
frontend/
├── public/             # Static assets
├── src/                # Source code
│   ├── assets/         # Images, fonts, etc.
│   ├── components/     # Reusable UI components
│   │   └── ui/         # Base UI components (shadcn/ui)
│   ├── config/         # Configuration files
│   ├── features/       # Feature-based modules
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and services
│   └── types/          # TypeScript type definitions
├── .env                # Environment variables
├── index.html          # HTML entry point
├── vite.config.ts      # Vite configuration
└── tailwind.config.js  # Tailwind CSS configuration
```

## Core Files

### Entry Points

- **src/main.tsx**: Application entry point that sets up React Query and renders the App component. It initializes the QueryClient and wraps the application with QueryClientProvider and StrictMode.

- **src/App.tsx**: Main component that defines the routing structure and wraps the application with providers. It sets up the Router, AuthProvider, AdminProvider, and ProfileProvider. Contains all route definitions including public routes (login, register) and protected routes (dashboard, profile, problems, etc.).

- **src/index.css**: Global CSS styles including Tailwind directives. Contains base styles, Tailwind utility classes, and custom global styles.

## Components

### Base Components (src/components/)

- **ProtectedRoute.tsx**: Route wrapper that redirects unauthenticated users to login. It checks if the user is authenticated using the AuthContext and redirects to the login page if not. Also supports role-based access control through the allowedRoles prop.

- **Navigation.tsx**: Main navigation component with links to different sections. Provides the sidebar navigation with links to dashboard, problems, profile, etc. Adapts based on user authentication status and role.

- **Navbar.tsx**: Top navigation bar component that displays the application logo and theme toggle. Simple component that provides consistent header across the application.

- **LevelSystem.tsx**: Component for displaying user learning progress. Visualizes the user's current level, experience points, and progress towards the next level. Includes animations and visual feedback.

- **ProblemList.tsx**: Component for displaying a list of coding problems. Includes filtering, sorting, and pagination functionality. Displays problem difficulty, completion status, and other metadata.

- **AdminToggle.tsx**: Toggle for switching between admin and user views. Only visible to users with admin privileges. Toggles the isAdminView state in the AdminContext.

- **GlobalSearch.tsx**: Global search component for searching across the application. Provides real-time search results as the user types. Supports searching for problems, topics, and other content.

- **ErrorBoundary.tsx**: React error boundary for catching and displaying errors. Prevents the entire application from crashing when an error occurs in a component tree. Displays a user-friendly error message.

- **ThemeToggle.tsx**: Toggle for switching between light and dark themes. Uses localStorage to persist the user's theme preference. Integrates with the system's color scheme preference.

### UI Components (src/components/ui/)

The UI directory contains base UI components built with shadcn/ui, which is a collection of reusable components built on top of Tailwind CSS and Radix UI primitives:

- **button.tsx**: Button component with various styles and variants. Supports primary, secondary, outline, ghost, link, and destructive variants. Includes loading state and icon support.

- **card.tsx**: Card component for displaying content in a contained box. Includes card header, title, description, content, and footer subcomponents. Used throughout the application for consistent content containers.

- **dialog.tsx**: Modal dialog component for displaying content that requires user attention or interaction. Includes title, description, content, and action buttons. Supports keyboard navigation and focus management.

- **input.tsx**: Input field component for text input. Supports various states like disabled, error, and read-only. Integrates with React Hook Form for form handling.

- **textarea.tsx**: Multiline text input component. Similar to input but supports multiple lines of text. Used for longer form inputs like descriptions or comments.

- **select.tsx**: Dropdown select component for selecting from a list of options. Supports single and multiple selection, grouping, and custom rendering of options.

- **checkbox.tsx**: Checkbox component for boolean input. Supports indeterminate state and custom styling. Integrates with React Hook Form.

- **switch.tsx**: Toggle switch component for boolean input with a visual toggle representation. Alternative to checkbox for boolean settings.

- **avatar.tsx**: User avatar component that displays user profile images or fallback initials. Supports various sizes and shapes.

- **badge.tsx**: Badge component for displaying status or labels. Supports various colors and variants to indicate different states or categories.

- **label.tsx**: Form label component that associates with form controls. Provides consistent styling and accessibility features.

- **table.tsx**: Table component for displaying tabular data. Includes header, row, cell, and pagination subcomponents. Supports sorting and custom cell rendering.

- **tabs.tsx**: Tabbed interface component for organizing content into separate views. Supports horizontal and vertical orientations.

- **separator.tsx**: Horizontal or vertical separator line for visually dividing content. Supports custom styling and orientation.

- **scroll-area.tsx**: Scrollable area with custom scrollbars. Provides a consistent scrolling experience across browsers and platforms.

- **collapsible.tsx**: Expandable/collapsible content component. Used for showing/hiding content to save space or focus attention.

- **markdown.tsx**: Component for rendering Markdown content with syntax highlighting and formatting. Uses react-markdown and remark-gfm for GitHub-flavored Markdown support.

- **console.tsx**: Console-like interface for displaying code output. Mimics a terminal or console environment with syntax highlighting, command history, and output formatting.

- **social-auth-button.tsx**: Button for social authentication providers like Google, GitHub, etc. Includes provider icons and consistent styling.

## Features

The application follows a feature-based architecture, with each feature having its own directory under `src/features/`:

### Authentication (src/features/auth/)

- **AuthContext.tsx**: Context provider for authentication state and methods. Manages user authentication state, login, logout, registration, and token handling. Provides authentication status and user information to the entire application.

- **LoginPage.tsx**: Login page component with email/password and social authentication options. Includes form validation, error handling, and redirect after successful login.

- **RegisterPage.tsx**: Registration page component with form for creating a new account. Includes validation for username, email, password, and terms acceptance.

- **OAuthCallback.tsx**: Callback handler for OAuth authentication. Processes the authentication response from OAuth providers and completes the authentication flow.

- **types.ts**: TypeScript types for authentication including AuthState, LoginCredentials, and RegisterData.

### Admin (src/features/admin/)

- **AdminContext.tsx**: Context provider for admin-related state and functionality. Manages the admin view toggle and provides admin status to components.

- **AdminDashboard.tsx**: Main admin dashboard component with tabs for different administrative functions. Includes problem management, user management, and system settings.

- **components/LearningPathAdmin.tsx**: Component for managing learning paths in the admin interface. Allows creating, editing, and organizing learning content, topics, and problems.

- **components/StandaloneInfoAdmin.tsx**: Component for managing standalone information pages in the admin interface. Allows creating and editing informational content.

### Dashboard (src/features/dashboard/)

- **DashboardPage.tsx**: Main dashboard page that displays user progress, recommended problems, and recent activity. Serves as the landing page after login.

### Profile (src/features/profile/)

- **ProfileContext.tsx**: Context provider for user profile data and methods. Manages profile information, settings, and preferences.

- **ProfilePage.tsx**: User profile page component that displays and allows editing of user information. Includes sections for personal information, preferences, and account settings.

### Problems (src/features/problems/)

- **ProblemsPage.tsx**: Page listing all available coding problems with filtering and sorting options. Displays problems in a table or grid view with difficulty indicators and completion status.

- **ProblemPage.tsx**: Page for viewing and solving a specific problem. Includes problem description, examples, constraints, and code editor.

- **components/ProblemList.tsx**: Component for displaying a list of problems with filtering and pagination.

- **components/ProblemTableHeader.tsx**: Header component for the problems table with sorting controls.

- **components/ProblemTableRow.tsx**: Row component for displaying problem information in the table.

- **components/DifficultyBadge.tsx**: Badge component for displaying problem difficulty (Easy, Medium, Hard).

- **components/ProblemActionButtons.tsx**: Action buttons for problem-related operations like solve, bookmark, or share.

- **components/CodingProblem.tsx**: Component for displaying and interacting with coding problems. Includes code editor, test cases, and submission handling.

- **components/InfoProblem.tsx**: Component for displaying informational problems or tutorials.

- **components/common/**: Directory containing common components used across problem-related features.

- **components/list/**: Directory containing components specific to problem listing.

- **components/navigation/**: Directory containing navigation components for the problems section.

- **components/coding/**: Directory containing components related to the coding interface.

- **types/**: Directory containing TypeScript types for problems, submissions, and related entities.

- **utils/**: Directory containing utility functions for problem-related operations.

- **hooks/**: Directory containing custom hooks for problem-related functionality.

- **config/**: Directory containing configuration for the problems feature.

### Topics (src/features/topics/)

- **TopicPage.tsx**: Page for displaying a specific learning topic with related problems and resources. Includes topic description, progress tracking, and problem list.

### Learning (src/features/learning/)

- **components/LevelSystem.tsx**: Component for displaying and managing the user's learning progress and level. Visualizes experience points, level progression, and achievements.

### Info (src/features/info/)

- **InfoPage.tsx**: Page for displaying informational content like tutorials, guides, or documentation. Supports Markdown content with syntax highlighting.

## Utilities and Services

### Lib (src/lib/)

- **api.ts**: API client and service functions for backend communication. Provides a unified interface for making HTTP requests to the backend API. Handles authentication, error handling, and response parsing. Includes specific API functions for different features.

- **utils.ts**: General utility functions used throughout the application. Includes the `cn` function for merging Tailwind classes with clsx and tailwind-merge.

- **queryClient.ts**: React Query client configuration for data fetching and caching. Sets up default options for queries like retry behavior and refetching strategies.

### Hooks (src/hooks/)

- **useLearningPath.ts**: Custom hook for managing learning path data and state. Provides functions for fetching, updating, and tracking progress in learning paths.

### Config (src/config/)

- **oauth.ts**: OAuth configuration for authentication providers. Contains settings for Google, GitHub, and other OAuth providers.

## Types (src/types/)

- **user.ts**: TypeScript types for user data including User interface with properties like id, username, email, role, and profile information.

## Build and Configuration Files

- **vite.config.ts**: Vite build tool configuration. Sets up plugins, aliases, build options, and development server settings.

- **tailwind.config.js**: Tailwind CSS configuration including theme customization, plugins, and content paths.

- **tsconfig.json**: TypeScript configuration for type checking, compilation options, and module resolution.

- **eslint.config.js**: ESLint configuration for code linting and style enforcement.

- **postcss.config.cjs**: PostCSS configuration for CSS processing with plugins like autoprefixer.

- **components.json**: shadcn/ui components configuration for styling and theming.

## Development Workflow

### Scripts

- **dev**: Start development server with hot module replacement.
- **build**: Build for production with optimizations and minification.
- **type-check**: Check TypeScript types without emitting files.
- **lint**: Run ESLint to check for code quality issues.
- **preview**: Preview production build locally before deployment.

## Authentication Flow

The application uses JWT-based authentication with support for OAuth providers. The authentication state is managed through the AuthContext provider, which provides login, logout, and registration functionality to the entire application.

1. **Login Process**:
   - User enters credentials or clicks on a social auth provider
   - AuthContext.login method is called
   - On successful authentication, JWT token is stored
   - User is redirected to the dashboard or previous location

2. **Token Management**:
   - Tokens are stored in localStorage
   - Tokens are automatically included in API requests
   - Token expiration is handled with refresh tokens
   - On token expiration, user is prompted to login again

3. **Logout Process**:
   - AuthContext.logout method is called
   - Tokens are removed from storage
   - User is redirected to the login page
   - Server-side session is terminated

## Routing Structure

The application uses React Router for navigation with the following main routes:

- **/login**: Login page
- **/register**: Registration page
- **/dashboard**: Main dashboard (protected)
- **/profile**: User profile (protected)
- **/problems**: List of coding problems (protected)
- **/problems/:problemId**: Individual problem page (protected)
- **/topics/:topicId**: Topic page (protected)
- **/info/:id**: Information page (protected)
- **/unauthorized**: Access denied page
- **/auth/callback/:provider**: OAuth callback handler
- **/**: Redirects to dashboard

Protected routes are wrapped with the ProtectedRoute component, which checks if the user is authenticated and redirects to the login page if not.

## State Management

The application uses a combination of:

1. **React Context API** for global state:
   - AuthContext: Authentication state and methods
   - AdminContext: Admin view state and permissions
   - ProfileContext: User profile data and settings

2. **React Query** for server state management and data fetching:
   - Caching and invalidation
   - Loading and error states
   - Optimistic updates
   - Background refetching

3. **Local component state** for UI-specific state:
   - Form inputs and validation
   - UI toggles and modals
   - Component-specific data

## Styling Approach

The application uses Tailwind CSS for styling with the following approach:

1. **Base UI components** from shadcn/ui (built on Radix UI primitives):
   - Accessible and customizable
   - Consistent design language
   - Responsive by default

2. **Utility classes** from Tailwind CSS:
   - Responsive design
   - Dark mode support
   - Custom theme colors and spacing

3. **Component-specific styles**:
   - Using the `cn` utility for class merging
   - Conditional styling based on props and state
   - Animation and transition classes

4. **Global styles** in index.css:
   - Base styles and resets
   - Typography scales
   - Custom animations

## Data Fetching Strategy

The application uses React Query for data fetching with the following patterns:

1. **API Service Layer**:
   - Centralized API client in api.ts
   - Feature-specific API functions
   - Error handling and response transformation

2. **Query Hooks**:
   - Custom hooks for specific data needs
   - Caching and refetching strategies
   - Loading and error states

3. **Optimistic Updates**:
   - Immediate UI updates before server confirmation
   - Rollback on error
   - Background synchronization

## Error Handling

The application implements comprehensive error handling:

1. **Global Error Boundary**:
   - Catches unhandled errors in component trees
   - Prevents application crashes
   - Displays user-friendly error messages

2. **API Error Handling**:
   - Centralized error processing in API client
   - Status code-based error handling
   - User-friendly error messages

3. **Form Validation**:
   - Client-side validation with Zod schemas
   - Inline error messages
   - Field-level validation feedback

## Accessibility

The application prioritizes accessibility through:

1. **Semantic HTML**:
   - Proper heading hierarchy
   - ARIA attributes where needed
   - Semantic element usage

2. **Keyboard Navigation**:
   - Focus management
   - Keyboard shortcuts
   - Tab order optimization

3. **Screen Reader Support**:
   - Alternative text for images
   - ARIA labels and descriptions
   - Announcements for dynamic content

## Performance Optimization

The application implements several performance optimizations:

1. **Code Splitting**:
   - Route-based code splitting
   - Lazy loading of components
   - Dynamic imports for large dependencies

2. **Memoization**:
   - React.memo for expensive components
   - useMemo for expensive calculations
   - useCallback for stable function references

3. **Asset Optimization**:
   - Image compression and responsive images
   - Font optimization with preloading
   - CSS and JS minification

## Conclusion

The frontend codebase follows modern React best practices with a feature-based architecture, reusable components, and a strong focus on type safety with TypeScript. The use of React Query for data fetching and Tailwind CSS for styling provides a solid foundation for building a maintainable and scalable application.

The application is designed with user experience in mind, providing a responsive, accessible, and performant interface for users to learn coding through interactive problems and structured learning paths. The admin interface allows for easy content management and user administration.

The codebase is structured to be maintainable and extensible, with clear separation of concerns and a consistent coding style. The use of TypeScript throughout the codebase ensures type safety and improves developer experience with better tooling and documentation. 