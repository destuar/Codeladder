/*
  Warnings:

  - You are about to drop the column `problemType` on the `problems` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "problems" DROP COLUMN "problemType",
ADD COLUMN     "type" "ProblemType" NOT NULL DEFAULT 'INFO';
