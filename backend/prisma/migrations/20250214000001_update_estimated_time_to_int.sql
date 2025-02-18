-- Rename the standalone_info_pages table temporarily if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'standalone_info_pages') THEN
        ALTER TABLE "standalone_info_pages" RENAME TO "standalone_info_pages_temp";
    END IF;
END $$;

-- First, create a temporary column to store the converted values
ALTER TABLE "problems" ADD COLUMN "estimatedTime_new" INTEGER;

-- Convert existing string values to integers
UPDATE "problems" 
SET "estimatedTime_new" = NULLIF(CAST("estimatedTime" AS INTEGER), 0)
WHERE "estimatedTime" IS NOT NULL AND "estimatedTime" ~ '^[0-9]+$';

-- Drop the old column and rename the new one
ALTER TABLE "problems" DROP COLUMN "estimatedTime";
ALTER TABLE "problems" RENAME COLUMN "estimatedTime_new" TO "estimatedTime";

-- Restore the standalone_info_pages table if it was renamed
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'standalone_info_pages_temp') THEN
        ALTER TABLE "standalone_info_pages_temp" RENAME TO "standalone_info_pages";
    END IF;
END $$; 