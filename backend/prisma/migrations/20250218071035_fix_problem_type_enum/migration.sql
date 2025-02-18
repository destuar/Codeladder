-- Drop existing enum after saving current values
CREATE TYPE "ProblemType_new" AS ENUM ('INFO', 'CODING', 'STANDALONE_INFO');

-- Remove the default temporarily
ALTER TABLE "problems" ALTER COLUMN "problemType" DROP DEFAULT;

-- Update the problems table to use the new enum
ALTER TABLE "problems" 
  ALTER COLUMN "problemType" TYPE "ProblemType_new" 
  USING ("problemType"::text::"ProblemType_new");

-- Drop the old enum
DROP TYPE "ProblemType";

-- Rename the new enum to the original name
ALTER TYPE "ProblemType_new" RENAME TO "ProblemType";

-- Restore the default
ALTER TABLE "problems" ALTER COLUMN "problemType" SET DEFAULT 'INFO'; 