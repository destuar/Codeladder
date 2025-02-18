-- Add estimatedTime column to problems table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='problems' AND column_name='estimatedTime') THEN
        ALTER TABLE "problems" ADD COLUMN "estimatedTime" INTEGER;
    END IF;
END $$;

-- Add estimatedTime column to standalone_info_pages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='standalone_info_pages' AND column_name='estimatedTime') THEN
        ALTER TABLE "standalone_info_pages" ADD COLUMN "estimatedTime" INTEGER;
    END IF;
END $$; 