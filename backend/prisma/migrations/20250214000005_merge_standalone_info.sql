-- First ensure the estimatedTime column exists in problems table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='problems' AND column_name='estimatedTime') THEN
        ALTER TABLE "problems" ADD COLUMN "estimatedTime" INTEGER;
    END IF;
END $$;

-- Migrate existing standalone info pages to problems if the table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_name = 'standalone_info_pages') THEN
        INSERT INTO "problems" (
            "id",
            "name",
            "content",
            "description",
            "difficulty",
            "required",
            "problemType",
            "estimatedTime",
            "createdAt",
            "updatedAt"
        )
        SELECT 
            "id",
            "name",
            "content",
            "description",
            'EASY_I'::Difficulty,  -- Default difficulty for standalone info
            false,                 -- Not required
            'STANDALONE_INFO'::ProblemType,
            "estimatedTime",
            "createdAt",
            "updatedAt"
        FROM "standalone_info_pages"
        ON CONFLICT (id) DO NOTHING;  -- Skip if already migrated

        -- Drop the standalone_info_pages table after successful migration
        DROP TABLE "standalone_info_pages";
    END IF;
END $$; 