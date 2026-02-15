ALTER TABLE "Attempt" ADD COLUMN "normalizedScore" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Attempt" ADD COLUMN "zScore" REAL;
ALTER TABLE "Attempt" ADD COLUMN "noteOn20" REAL;
UPDATE "Attempt" SET "normalizedScore" = "score";

CREATE TABLE "StudentStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "zMean" REAL NOT NULL,
    "noteOn20" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentStats_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudentStats_userId_classId_key" ON "StudentStats"("userId", "classId");
