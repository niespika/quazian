PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quiz_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Quiz" ("id", "classId", "weekKey", "slot", "createdAt")
SELECT "id", "classId", 'legacy-' || "id", 'A', "createdAt"
FROM "Quiz";

DROP TABLE "Quiz";
ALTER TABLE "new_Quiz" RENAME TO "Quiz";

CREATE UNIQUE INDEX "Quiz_classId_weekKey_slot_key" ON "Quiz"("classId", "weekKey", "slot");

CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "optionSignature" TEXT NOT NULL,
    CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizQuestion_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "QuizQuestion_optionSignature_idx" ON "QuizQuestion"("optionSignature");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
