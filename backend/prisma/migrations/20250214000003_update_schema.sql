-- Create a temporary column to store the converted values
ALTER TABLE "problems" ADD COLUMN "estimatedTime_new" INTEGER;

-- Convert existing string values to integers
UPDATE "problems" 
SET "estimatedTime_new" = NULLIF(CAST("estimatedTime" AS INTEGER), 0)
WHERE "estimatedTime" IS NOT NULL AND "estimatedTime" ~ '^[0-9]+$';

-- Drop the old column and rename the new one
ALTER TABLE "problems" DROP COLUMN "estimatedTime";
ALTER TABLE "problems" RENAME COLUMN "estimatedTime_new" TO "estimatedTime";

-- Rename StandaloneInfoPage table to match the schema
ALTER TABLE IF EXISTS "StandaloneInfoPage" RENAME TO "standalone_info_pages"; 