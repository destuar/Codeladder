-- CreateEnum
CREATE TYPE "ProblemType" AS ENUM ('INFO', 'CODING');

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "codeTemplate" TEXT,
ADD COLUMN     "problemType" "ProblemType" NOT NULL DEFAULT 'INFO',
ADD COLUMN     "testCases" TEXT;
