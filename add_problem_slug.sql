-- Add slug column to problems table
ALTER TABLE "problems" ADD COLUMN "slug" TEXT UNIQUE;

-- Initialize slugs for existing problems based on their names
-- Convert spaces to hyphens, convert to lowercase, and remove special characters
UPDATE "problems" 
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REPLACE(name, ' ', '-'),
    '[^a-zA-Z0-9\-]', '', 'g'
  )
);

-- Make sure slugs are unique by appending ID for any duplicates
WITH duplicate_slugs AS (
  SELECT slug, COUNT(*) as cnt
  FROM "problems"
  GROUP BY slug
  HAVING COUNT(*) > 1
)
UPDATE "problems" p
SET slug = p.slug || '-' || p.id
FROM duplicate_slugs d
WHERE p.slug = d.slug;

-- Create index for faster lookups
CREATE INDEX idx_problems_slug ON "problems"("slug"); 