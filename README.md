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