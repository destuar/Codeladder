/*
  Warnings:

  - The `testCases` column on the `problems` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "problems" DROP COLUMN "testCases",
ADD COLUMN     "testCases" JSONB;
