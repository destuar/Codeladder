-- Add slug column to topics table
ALTER TABLE "topics" ADD COLUMN "slug" TEXT UNIQUE;

-- Initialize slugs for existing topics based on their names
-- Convert spaces to hyphens, convert to lowercase, and remove special characters
UPDATE "topics" 
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REPLACE(name, ' ', '-'),
    '[^a-zA-Z0-9\-]', '', 'g'
  )
);

-- Make sure slugs are unique by appending ID for any duplicates
WITH duplicate_slugs AS (
  SELECT slug, COUNT(*) as cnt
  FROM "topics"
  GROUP BY slug
  HAVING COUNT(*) > 1
)
UPDATE "topics" t
SET slug = t.slug || '-' || t.id
FROM duplicate_slugs d
WHERE t.slug = d.slug;

-- Create index for faster lookups
CREATE INDEX idx_topics_slug ON "topics"("slug"); 