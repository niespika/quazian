-- Redefine Attempt to remove deprecated normalizedScore.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "zScore" REAL,
    "noteOn20" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attempt" ("id", "userId", "quizId", "score", "zScore", "noteOn20", "createdAt")
SELECT "id", "userId", "quizId", "score", "zScore", "noteOn20", "createdAt"
FROM "Attempt";
DROP TABLE "Attempt";
ALTER TABLE "new_Attempt" RENAME TO "Attempt";
CREATE UNIQUE INDEX "Attempt_userId_quizId_key" ON "Attempt"("userId", "quizId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Materialized weekly aggregates for professor dashboard analytics.
CREATE TABLE "StudentWeeklyStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptsCount" INTEGER NOT NULL,
    "meanScore" REAL,
    "zScore" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentWeeklyStats_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentWeeklyStats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudentWeeklyStats_weekStart_classId_studentId_key" ON "StudentWeeklyStats"("weekStart", "classId", "studentId");
CREATE INDEX "StudentWeeklyStats_classId_weekStart_idx" ON "StudentWeeklyStats"("classId", "weekStart");
CREATE INDEX "StudentWeeklyStats_studentId_weekStart_idx" ON "StudentWeeklyStats"("studentId", "weekStart");
