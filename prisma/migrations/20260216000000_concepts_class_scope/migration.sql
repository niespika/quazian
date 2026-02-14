PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Concept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "distractors" TEXT NOT NULL,
    "dateSeen" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Concept_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Concept" ("id", "classId", "subject", "title", "correctAnswer", "distractors", "dateSeen", "createdAt")
SELECT "Concept"."id", "fallbackClass"."id", "Concept"."subject", "Concept"."title", "Concept"."correctAnswer", "Concept"."distractors", "Concept"."dateSeen", "Concept"."createdAt"
FROM "Concept"
JOIN (
  SELECT "id" FROM "Class" ORDER BY "id" LIMIT 1
) AS "fallbackClass" ON 1 = 1;

DROP TABLE "Concept";
ALTER TABLE "new_Concept" RENAME TO "Concept";
CREATE INDEX "Concept_classId_idx" ON "Concept"("classId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
