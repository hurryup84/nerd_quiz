-- AlterTable
ALTER TABLE "Question" ADD COLUMN "creatorId" INTEGER;
ALTER TABLE "Question" ADD COLUMN "aiAssisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Question_creatorId_idx" ON "Question"("creatorId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
