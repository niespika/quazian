-- Redefine Concept to belong to professor and support many class assignments
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Concept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "distractors" TEXT NOT NULL,
    "dateSeen" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Concept_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Concept" ("id", "profId", "subject", "title", "correctAnswer", "distractors", "dateSeen", "createdAt")
SELECT "Concept"."id", "Class"."profId", "Concept"."subject", "Concept"."title", "Concept"."correctAnswer", "Concept"."distractors", "Concept"."dateSeen", "Concept"."createdAt"
FROM "Concept"
INNER JOIN "Class" ON "Class"."id" = "Concept"."classId";

CREATE TABLE "ClassConcept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassConcept_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "ClassConcept" ("id", "classId", "conceptId", "assignedAt")
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
       substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
       "classId",
       "id",
       CURRENT_TIMESTAMP
FROM "Concept";

DROP TABLE "Concept";
ALTER TABLE "new_Concept" RENAME TO "Concept";

CREATE INDEX "Concept_profId_idx" ON "Concept"("profId");
CREATE INDEX "ClassConcept_classId_idx" ON "ClassConcept"("classId");
CREATE INDEX "ClassConcept_conceptId_idx" ON "ClassConcept"("conceptId");
CREATE UNIQUE INDEX "ClassConcept_classId_conceptId_key" ON "ClassConcept"("classId", "conceptId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
