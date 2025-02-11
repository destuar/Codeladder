/*
  Warnings:

  - You are about to drop the column `type` on the `problems` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "problems" DROP COLUMN "type",
ADD COLUMN     "problemType" "ProblemType" NOT NULL DEFAULT 'INFO';
