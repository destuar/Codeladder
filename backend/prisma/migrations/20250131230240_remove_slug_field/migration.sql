/*
  Warnings:

  - You are about to drop the column `slug` on the `topics` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "topics_slug_key";

-- AlterTable
ALTER TABLE "topics" DROP COLUMN "slug";
