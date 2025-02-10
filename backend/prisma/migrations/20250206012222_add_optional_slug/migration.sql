/*
  Warnings:

  - The primary key for the `_UserCompletedProblems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_UserCompletedProblems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `topics` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `topics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "_UserCompletedProblems" DROP CONSTRAINT "_UserCompletedProblems_AB_pkey";

-- AlterTable
ALTER TABLE "topics" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "_UserCompletedProblems_AB_unique" ON "_UserCompletedProblems"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");
