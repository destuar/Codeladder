-- AlterTable
ALTER TABLE "_UserCompletedProblems" ADD CONSTRAINT "_UserCompletedProblems_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserCompletedProblems_AB_unique";
