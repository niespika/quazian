import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Prisma schema scopes Concept to professor and ClassConcept assignments", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  assert.match(schema, /model Concept \{[\s\S]*prof\s+User\s+@relation\("ProfConcepts", fields: \[profId\], references: \[id\]\)/);
  assert.match(schema, /model Concept \{[\s\S]*profId\s+String/);
  assert.doesNotMatch(schema, /model Concept \{[\s\S]*classId\s+String/);
  assert.match(schema, /model ClassConcept \{[\s\S]*classId\s+String[\s\S]*conceptId\s+String/);
  assert.match(schema, /@@unique\(\[classId, conceptId\]\)/);
});

test("migration copies legacy concept classId to ClassConcept and drops classId from Concept", () => {
  const migration = readFileSync("prisma/migrations/20260217000000_concepts_multi_class/migration.sql", "utf8");

  assert.match(migration, /INSERT INTO "ClassConcept"/);
  assert.match(migration, /SELECT[\s\S]*"classId"[\s\S]*FROM "Concept"/);
  assert.match(migration, /"profId" TEXT NOT NULL/);
  assert.doesNotMatch(migration, /"new_Concept"[\s\S]*"classId" TEXT NOT NULL/);
});
