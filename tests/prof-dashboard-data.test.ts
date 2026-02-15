import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProfessorDashboardData,
  normalizeProfessorDashboardSort,
  resolveProfessorDashboardClassId,
} from "@/lib/prof-dashboard";

test("resolveProfessorDashboardClassId blocks classes not owned by professor", () => {
  const selection = resolveProfessorDashboardClassId(
    [
      { id: "class-1" },
      { id: "class-2" },
    ],
    "class-999",
  );

  assert.equal(selection.classId, null);
  assert.equal(selection.forbidden, true);
});

test("buildProfessorDashboardData computes student mastery summaries", () => {
  const dashboard = buildProfessorDashboardData({
    students: [
      { userId: "student-1", name: "Alice", email: "alice@example.com" },
      { userId: "student-2", name: null, email: "bob@example.com" },
    ],
    attempts: [
      {
        userId: "student-1",
        quizId: "quiz-1",
        normalizedScore: 0.8,
        zScore: null,
        createdAt: new Date("2026-02-10T00:00:00.000Z"),
      },
      {
        userId: "student-2",
        quizId: "quiz-1",
        normalizedScore: 0.2,
        zScore: null,
        createdAt: new Date("2026-02-09T00:00:00.000Z"),
      },
    ],
    studentStats: [{ userId: "student-1", zMean: 1, noteOn20: 14 }],
    concepts: [
      { id: "concept-1", subject: "MATH", title: "Fractions" },
      { id: "concept-2", subject: "MATH", title: "Algebra" },
    ],
    masteries: [
      { userId: "student-1", conceptId: "concept-1", pMastery: 0.9 },
      { userId: "student-1", conceptId: "concept-2", pMastery: 0.81 },
      { userId: "student-2", conceptId: "concept-1", pMastery: 0.7 },
      { userId: "student-2", conceptId: "concept-2", pMastery: 0.2 },
    ],
    sort: normalizeProfessorDashboardSort("finalNoteOn20_desc"),
  });

  assert.equal(dashboard.totalConceptsAssigned, 2);
  assert.equal(dashboard.studentRows[0]?.displayName, "Alice");
  assert.equal(dashboard.studentRows[0]?.masteredCount, 2);
  assert.equal(dashboard.studentRows[0]?.totalConceptsAssigned, 2);
  assert.equal(dashboard.studentRows[0]?.masteryPercent, 100);

  assert.equal(dashboard.studentRows[1]?.displayName, "bob@example.com");
  assert.equal(dashboard.studentRows[1]?.masteredCount, 0);
  assert.equal(dashboard.studentRows[1]?.masteryPercent, 0);
  assert.equal(dashboard.studentRows[1]?.lastZScore, -1);
});

test("buildProfessorDashboardData computes concept mastery panel ordered by least mastered first", () => {
  const dashboard = buildProfessorDashboardData({
    students: [
      { userId: "student-1", name: "Alice", email: "alice@example.com" },
      { userId: "student-2", name: "Bob", email: "bob@example.com" },
      { userId: "student-3", name: "Cara", email: "cara@example.com" },
    ],
    attempts: [],
    studentStats: [],
    concepts: [
      { id: "concept-a", subject: "SCI", title: "Optics" },
      { id: "concept-b", subject: "SCI", title: "Mechanics" },
    ],
    masteries: [
      { userId: "student-1", conceptId: "concept-a", pMastery: 0.9 },
      { userId: "student-2", conceptId: "concept-a", pMastery: 0.3 },
      { userId: "student-3", conceptId: "concept-a", pMastery: 0.1 },
      { userId: "student-1", conceptId: "concept-b", pMastery: 0.95 },
      { userId: "student-2", conceptId: "concept-b", pMastery: 0.85 },
      { userId: "student-3", conceptId: "concept-b", pMastery: 0.8 },
    ],
    sort: "zMean_desc",
  });

  assert.equal(dashboard.conceptRows[0]?.title, "Optics");
  assert.equal(dashboard.conceptRows[0]?.masteredPercent, 33.33);
  assert.equal(dashboard.conceptRows[0]?.avgPMastery, 0.43);

  assert.equal(dashboard.conceptRows[1]?.title, "Mechanics");
  assert.equal(dashboard.conceptRows[1]?.masteredPercent, 100);
  assert.equal(dashboard.conceptRows[1]?.avgPMastery, 0.87);
});
