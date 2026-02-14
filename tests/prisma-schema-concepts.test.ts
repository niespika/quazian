import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Prisma schema scopes Concept to Class via classId relation", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  assert.match(schema, /model Concept \{[\s\S]*class\s+Class\s+@relation\(fields: \[classId\], references: \[id\]\)/);
  assert.match(schema, /model Concept \{[\s\S]*classId\s+String/);
});
