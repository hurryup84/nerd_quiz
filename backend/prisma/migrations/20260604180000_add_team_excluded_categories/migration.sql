-- CreateTable
CREATE TABLE "TeamExcludedCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teamId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "TeamExcludedCategory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamExcludedCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamExcludedCategory_teamId_categoryId_key" ON "TeamExcludedCategory"("teamId", "categoryId");