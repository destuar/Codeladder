-- AlterEnum
ALTER TYPE "ProblemType" ADD VALUE 'STANDALONE_INFO';

-- DropForeignKey
ALTER TABLE "problems" DROP CONSTRAINT "problems_topicId_fkey";

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "estimatedTime" INTEGER,
ALTER COLUMN "topicId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "standalone_info_pages" ADD COLUMN     "estimatedTime" INTEGER;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
