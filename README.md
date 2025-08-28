# CodeLadder

A learning platform focused on Data Structures & Algorithms (DSA) using a Mastery-Based Learning Model.

## Project Structure

```
codeladder/
├── frontend/           # React frontend application
│   ├── src/           # Source code
│   ├── components/    # Reusable UI components
│   └── public/        # Static assets
├── backend/           # Express backend application
│   ├── src/          # Source code
│   └── prisma/       # Database schema and migrations
├── infra/            # Infrastructure configurations
│   ├── docker/       # Docker configurations
│   ├── jenkins/      # CI/CD pipelines
│   └── scripts/      # Utility scripts
└── docs/             # Project documentation
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Jenkins, AWS

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0.0
- Docker
- AWS Account (for deployment)

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/codeladder.git
cd codeladder
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp .env.example .env
cd frontend && cp .env.example .env
cd ../backend && cp .env.example .env
```

4. Start development servers:

Using Docker:
```bash
docker-compose -f infra/docker/docker-compose.yml up
```

Or manually:
```bash
# Terminal 1 - Frontend
cd frontend && npm run dev

# Terminal 2 - Backend
cd backend && npm run dev
```

## Testing

```bash
# Run frontend tests
cd frontend && npm test

# Run backend tests
cd backend && npm test
```

## Deployment

See [Infrastructure Documentation](./infra/README.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Documentation

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)
- [Infrastructure Documentation](./infra/README.md)
- [API Documentation](./docs/api.md)

# Multi-Language Support for Code Problems

This feature adds support for multiple programming languages in coding problems. It allows administrators to:

1. Enable/disable specific programming languages for each problem
2. Set different code templates for each supported language
3. Add reference implementations for each language
4. Specify a default language for each problem

## Implementation

The feature consists of the following components:

### Types and Models

- Added `LanguageData` interface in `frontend/src/features/problems/types/coding.ts`
- Updated `TestCase` interface to include `functionParams` for improved parameter display
- Added `FunctionParameter` interface for parameter information

### UI Components

- Created a dedicated `LanguageSupport` component in `frontend/src/features/languages/components/LanguageSupport.tsx`
- This component provides:
  - Language selection via checkboxes
  - Default language selection
  - Code template editing for each language
  - Reference implementation editing for each language

### Integration

To integrate the language support feature into the admin interface:

1. Import the `LanguageSupport` component and related types in your admin component:
   ```typescript
   import { 
     LanguageSupport, 
     defaultSupportedLanguages,
     prepareLanguageSupport 
   } from '@/features/languages/components/LanguageSupport';
   ```

2. Add state for supported languages:
   ```typescript
   const [supportedLanguages, setSupportedLanguages] = useState(defaultSupportedLanguages);
   ```

3. Add the component to your form:
   ```typescript
   <LanguageSupport
     supportedLanguages={supportedLanguages}
     setSupportedLanguages={setSupportedLanguages}
     defaultLanguage={defaultLanguage}
     setDefaultLanguage={setDefaultLanguage}
   />
   ```

4. When submitting to the API, use the `prepareLanguageSupport` function:
   ```typescript
   const languageSupport = prepareLanguageSupport(defaultLanguage, supportedLanguages);
   
   // Include in your API payload
   const payload = {
     // ... other fields
     supportedLanguages: languageSupport
   };
   ```

## Backward Compatibility

The feature maintains backward compatibility with existing code templates by:

1. Converting old `codeTemplate` fields to the new structure
2. Defaulting to the `defaultLanguage` if no supported languages are enabled
3. Supporting both old and new API formats

## Future Improvements

- Add syntax highlighting in the template editor
- Support more programming languages 
- Add language-specific test cases
- Implement automated testing across languages