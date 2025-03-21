# Components

This directory contains shared UI components used throughout the CodeLadder application. These components are designed to be reusable across multiple features and pages.

## Directory Structure

- `/ui` - Core UI components, many based on shadcn/ui
- `ErrorBoundary.tsx` - Component for catching and displaying errors
- `LevelSystem.tsx` - Component for displaying the learning level system
- `Navbar.tsx` - Application navigation bar
- `Navigation.tsx` - Navigation wrapper component
- `ProblemList.tsx` - Reusable component for displaying problem lists
- `ProtectedRoute.tsx` - Route protection component for authentication
- Other shared components used across the application

## Design Principles

The components in this directory follow these design principles:
- **Reusability**: Components are designed to be used in multiple contexts
- **Composability**: Components can be combined to create more complex UIs
- **Accessibility**: Components follow accessibility best practices
- **Consistency**: Components maintain a consistent design language
- **Modularity**: Components have clear, focused responsibilities

## Usage Guidelines

When using these components:
1. Import them directly from the components directory
2. Pass required props as documented in each component
3. For UI components, follow the shadcn/ui patterns
4. Avoid modifying these components for feature-specific needs; instead create specialized versions in feature directories

## Component Categories

- **Layout Components**: Structure the page (e.g., `Navigation`)
- **UI Components**: Basic UI elements like buttons, cards, inputs
- **Functional Components**: Components with specific functional roles (e.g., `ProblemList`, `ProtectedRoute`)
- **Display Components**: Components for displaying specific types of content

## Adding New Components

When adding new components to this directory:
1. Ensure the component is truly reusable across features
2. Follow the existing naming and file structure conventions
3. Document props and usage patterns
4. Consider extracting feature-specific components to their respective feature directories

## Notes

The global components directory should only contain components that are used across multiple features. Feature-specific components should be placed in their respective feature directories to maintain a clean separation of concerns. 