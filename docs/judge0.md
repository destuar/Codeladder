# Judge0 Integration in CodeLadder

## Overview
The CodeLadder platform uses Judge0 as its code execution engine for evaluating student code submissions. This document details the current implementation, configuration, and areas for future improvement.

## Current Implementation

### Architecture
- **Frontend**: Monaco Editor for code editing
- **Backend**: Express.js API with dedicated Judge0 service layer
- **Execution Engine**: Judge0 API (external service)
- **Database**: PostgreSQL with Prisma ORM for storing submissions and results

### Data Flow
1. User submits code via frontend
2. Backend receives code and identifies the problem and test cases
3. Code is formatted with test drivers via `formatTestCode()`
4. Formatted code is submitted to Judge0 via `submitCode()`
5. Results are polled until completion or timeout
6. Results are processed and stored in database
7. Processed results are returned to frontend

### Configuration
- Judge0 API URL: Set via `JUDGE0_API_URL` environment variable (default: https://judge0-ce.p.rapidapi.com)
- Auth token: Set via `JUDGE0_AUTH_TOKEN` environment variable
- Timeout: Set via `JUDGE0_TIMEOUT` environment variable (defaults to 10000ms)
- Execution limits:
  - CPU time: 2 seconds
  - Memory: 128MB
  - Compilation timeout: 10 seconds

### Supported Languages
Currently supports:
- JavaScript (102) - Node.js 22.08.0
- Python (109) - Python 3.13.2
- Java (91) - JDK 17.0.6
- C++ (105) - GCC 14.1.0
- C (103) - GCC 14.1.0
- Go (107) - Go 1.23.5
- Rust (108) - Rust 1.85.0
- Ruby (72) - Ruby 2.7.0
- TypeScript (101) - TypeScript 5.6.2
- C# (51) - Mono 6.6.0.161

Note: CodeLadder previously used Judge0 Extra CE but has been updated to use Judge0 CE for broader language support.

### API Endpoints
- **POST /api/v2/code/execute**: Execute code against all test cases for a problem
- **POST /api/v2/code/custom-test**: Execute code with custom input
- **POST /api/v2/code/run-tests**: Execute code for testing without storing submissions

### Rate Limiting
- Regular execution: 30 submissions per 5 minutes
- Test runs: 20 runs per minute

### Test Case Handling
- Test cases stored in `TestCase` model
- Support for hidden test cases
- Comparison logic handles different data types and formats
- Results stored in `TestCaseResult` model

### Error Handling
- Compilation errors captured and returned
- Runtime errors captured and returned
- Timeout handling with retry mechanism (10 retries with 1-second delay)
- Error information stored in submission record

## Database Schema
```prisma
model CodeProblem {
  questionId   String       @id @map("question_id")
  question     QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  codeTemplate String?      @map("code_template") @db.Text
  functionName String?      @map("function_name")
  language     String       @default("javascript")
  timeLimit    Int          @default(5000) @map("time_limit") // Execution time limit in ms
  memoryLimit  Int?         @map("memory_limit") // Memory limit in MB if applicable
  testCases    TestCase[]
}

model TestCase {
  id             String      @id @default(cuid())
  codeProblem    CodeProblem @relation(fields: [codeProblemId], references: [questionId], onDelete: Cascade)
  codeProblemId  String      @map("code_problem_id")
  input          String      @db.Text
  expectedOutput String      @map("expected_output") @db.Text
  isHidden       Boolean     @default(false) @map("is_hidden")
  orderNum       Int?        @map("order_num")
  results        TestCaseResult[]
}

model Submission {
  id            String           @id @default(cuid())
  code          String           @db.Text
  language      String
  status        SubmissionStatus @default(PENDING)
  results       Json? // JSON array of test results
  executionTime Int? // Milliseconds
  memory        Int? // Kilobytes
  error         String? @db.Text
  compileOutput String? @db.Text
  passed        Boolean  @default(false)
  submittedAt   DateTime @default(now())
  user          User    @relation(fields: [userId], references: [id])
  userId        String
  problem       Problem @relation(fields: [problemId], references: [id])
  problemId     String
}
```

## Current Service Implementation
The Judge0 service layer is implemented in `backend/src/services/judge0Service.ts` and provides:
- Code submission
- Result polling
- Formatting with test drivers
- Result processing

## Future Work & Improvements

### High Priority
1. **Judge0 Self-Hosting**: Deploy a dedicated Judge0 instance for better control
2. **Execution Sandboxing**: Enhance security for code execution
3. **Robust Error Handling**: Improve error reporting for edge cases
4. **Language Support Expansion**: Add more languages with proper test drivers
5. **Test Driver Upgrades**: Improve the test driver generation for each language

### Medium Priority
1. **Execution Metrics**: Enhance performance tracking
2. **Result Caching**: Cache results to improve performance
3. **Batch Processing**: Optimize batch submissions
4. **Test Case Coverage Analysis**: Add test coverage metrics
5. **Custom Test Frameworks**: Support for Jest, Mocha, etc.

### Low Priority
1. **UI Improvements**: Better display of results and errors
2. **Plagiarism Detection**: Integrate code similarity checking
3. **Code Quality Analysis**: Integrate with linters/static analyzers
4. **Interactive Debugging**: Step through execution for educational purposes
5. **Multi-file Support**: Support for projects with multiple files

## Setup Instructions

### Prerequisites
1. Running Judge0 instance (local or remote)
2. Environment variables properly configured

### Configuration
Add the following to your `.env` file:
```
JUDGE0_API_URL=http://your-judge0-instance:2358
JUDGE0_AUTH_TOKEN=your-auth-token
JUDGE0_TIMEOUT=10000
```

### Deployment Notes
- Judge0 requires significant CPU and memory resources
- Consider containerization for consistent execution environment
- Implement proper monitoring for the Judge0 service

## Troubleshooting
- **Timeouts**: Check if Judge0 is overloaded or network is congested
- **Compilation Errors**: Verify language version compatibility
- **Runtime Errors**: Check memory limits and execution time constraints 