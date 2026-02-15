import test from "node:test";
import assert from "node:assert/strict";
import { buildConceptLists, buildStudentConceptMasteryWhere, scoreToNoteOn20 } from "@/lib/student-dashboard";

const concepts = [
  { id: "1", subject: "PHILO", title: "Stoicism", pMastery: 0.9 },
  { id: "2", subject: "HLP", title: "Cellular Respiration", pMastery: 0.68 },
  { id: "3", subject: "PHILO", title: "Existentialism", pMastery: 0.72 },
  { id: "4", subject: "HLP", title: "Photosynthesis", pMastery: 0.45 },
];

test("scoreToNoteOn20 converts zMean to /20 with clamping", () => {
  assert.equal(scoreToNoteOn20(1), 14);
  assert.equal(scoreToNoteOn20(-1), 6);
  assert.equal(scoreToNoteOn20(0), 10);
  assert.equal(scoreToNoteOn20(20), 20);
  assert.equal(scoreToNoteOn20(-20), 0);
  assert.equal(scoreToNoteOn20(null), null);
});

test("buildConceptLists splits concepts by mastery threshold and groups by subject", () => {
  const lists = buildConceptLists(concepts, "subject", "all");

  assert.deepEqual(
    lists.mastered.map((group) => group.subject),
    ["PHILO"],
  );
  assert.deepEqual(
    lists.mastered[0]?.concepts.map((concept) => concept.title),
    ["Existentialism", "Stoicism"],
  );
  assert.deepEqual(
    lists.toWorkOn.map((group) => group.subject),
    ["HLP"],
  );
});

test("buildConceptLists applies sort and filter options", () => {
  const toWorkOnOnly = buildConceptLists(concepts, "p_mastery_asc", "to_work_on");

  assert.equal(toWorkOnOnly.mastered.length, 0);
  assert.equal(toWorkOnOnly.toWorkOn[0]?.concepts[0]?.title, "Photosynthesis");
  assert.equal(toWorkOnOnly.toWorkOn[0]?.concepts[1]?.title, "Cellular Respiration");
});


test("buildStudentConceptMasteryWhere scopes concepts to the student class", () => {
  assert.deepEqual(buildStudentConceptMasteryWhere("student-1", "class-9"), {
    userId: "student-1",
    concept: { assignments: { some: { classId: "class-9" } } },
  });
});
