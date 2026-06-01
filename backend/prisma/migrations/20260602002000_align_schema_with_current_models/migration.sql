PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "Settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

CREATE TABLE "RoundQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quizRoundId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "RoundQuestion_quizRoundId_fkey" FOREIGN KEY ("quizRoundId") REFERENCES "QuizRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoundQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "RoundQuestion" ("quizRoundId", "questionId", "order")
SELECT "id", "questionId", 1
FROM "QuizRound";

CREATE TABLE "RoundFinalization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quizRoundId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundFinalization_quizRoundId_fkey" FOREIGN KEY ("quizRoundId") REFERENCES "QuizRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoundFinalization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "new_QuizRound" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requiredParticipants" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "timeoutAt" DATETIME,
    CONSTRAINT "QuizRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_QuizRound" ("id", "requiredParticipants", "status", "createdById", "createdAt", "finishedAt", "timeoutAt")
SELECT "id", "requiredParticipants", "status", "createdById", "createdAt", "finishedAt", "timeoutAt"
FROM "QuizRound";

DROP TABLE "QuizRound";
ALTER TABLE "new_QuizRound" RENAME TO "QuizRound";

CREATE TABLE "new_Answer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quizRoundId" INTEGER NOT NULL,
    "roundQuestionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Answer_quizRoundId_fkey" FOREIGN KEY ("quizRoundId") REFERENCES "QuizRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Answer_roundQuestionId_fkey" FOREIGN KEY ("roundQuestionId") REFERENCES "RoundQuestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Answer" ("id", "quizRoundId", "roundQuestionId", "userId", "selectedAnswer", "createdAt", "updatedAt")
SELECT
    "Answer"."id",
    "Answer"."quizRoundId",
    "RoundQuestion"."id",
    "Answer"."userId",
    "Answer"."selectedAnswer",
    "Answer"."createdAt",
    "Answer"."createdAt"
FROM "Answer"
JOIN "RoundQuestion"
  ON "RoundQuestion"."quizRoundId" = "Answer"."quizRoundId";

DROP TABLE "Answer";
ALTER TABLE "new_Answer" RENAME TO "Answer";

CREATE INDEX "QuizRound_status_idx" ON "QuizRound"("status");
CREATE INDEX "Answer_quizRoundId_idx" ON "Answer"("quizRoundId");
CREATE INDEX "Answer_userId_idx" ON "Answer"("userId");
CREATE UNIQUE INDEX "Answer_userId_roundQuestionId_key" ON "Answer"("userId", "roundQuestionId");
CREATE INDEX "RoundQuestion_quizRoundId_idx" ON "RoundQuestion"("quizRoundId");
CREATE UNIQUE INDEX "RoundQuestion_quizRoundId_questionId_key" ON "RoundQuestion"("quizRoundId", "questionId");
CREATE UNIQUE INDEX "RoundFinalization_quizRoundId_userId_key" ON "RoundFinalization"("quizRoundId", "userId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;