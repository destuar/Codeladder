-- Add slug column to collections table
ALTER TABLE "collections" ADD COLUMN "slug" TEXT UNIQUE;

-- Initialize slugs for existing collections based on their names
-- Convert spaces to hyphens, convert to lowercase, and remove special characters
UPDATE "collections" 
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REPLACE(name, ' ', '-'),
    '[^a-zA-Z0-9\-]', '', 'g'
  )
);

-- Make sure slugs are unique by appending ID for any duplicates
WITH duplicate_slugs AS (
  SELECT slug, COUNT(*) as cnt
  FROM "collections"
  GROUP BY slug
  HAVING COUNT(*) > 1
)
UPDATE "collections" c
SET slug = c.slug || '-' || c.id
FROM duplicate_slugs d
WHERE c.slug = d.slug;

-- Create index for faster lookups
CREATE INDEX idx_collections_slug ON "collections"("slug"); 