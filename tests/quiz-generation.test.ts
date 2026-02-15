import test from "node:test";
import assert from "node:assert/strict";

import { buildQuestionOptions, selectConceptsForQuiz } from "@/lib/quiz-generation";

test("selection prioritizes new concepts and fragile mastery", () => {
  const now = new Date("2026-02-15T12:00:00.000Z");
  const concepts = [
    {
      id: "new-concept",
      subject: "PHILO",
      title: "New",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-02-14T10:00:00.000Z"),
      avgMastery: 0.2,
    },
    {
      id: "fragile-concept",
      subject: "HLP",
      title: "Fragile",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-20T10:00:00.000Z"),
      avgMastery: 0.72,
    },
    {
      id: "old-mastered",
      subject: "PHILO",
      title: "Mastered",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-01T10:00:00.000Z"),
      avgMastery: 0.95,
    },
    {
      id: "fill-1",
      subject: "HLP",
      title: "Fill 1",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-10T10:00:00.000Z"),
      avgMastery: 0.6,
    },
  ];

  const selected = selectConceptsForQuiz(concepts, now, new Date("2026-02-12T00:00:00.000Z"));

  assert.equal(selected[0]?.id, "new-concept");
  assert.equal(selected[1]?.id, "fragile-concept");
  assert.ok(selected.length >= 4);
});

test("selection enforces PHILO and HLP subject mixing when available", () => {
  const now = new Date("2026-02-15T12:00:00.000Z");
  const concepts = [
    {
      id: "c1",
      subject: "PHILO",
      title: "P",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-20T10:00:00.000Z"),
      avgMastery: 0.9,
    },
    {
      id: "c2",
      subject: "OTHER",
      title: "O1",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-20T10:00:00.000Z"),
      avgMastery: 0.9,
    },
    {
      id: "c3",
      subject: "OTHER",
      title: "O2",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-20T10:00:00.000Z"),
      avgMastery: 0.9,
    },
    {
      id: "c4",
      subject: "HLP",
      title: "H",
      correctAnswer: "A",
      distractors: JSON.stringify(["B", "C", "D", "E"]),
      dateSeen: new Date("2026-01-20T10:00:00.000Z"),
      avgMastery: 0.9,
    },
  ];

  const selected = selectConceptsForQuiz(concepts, now);
  const subjects = new Set(selected.map((concept) => concept.subject));

  assert.ok(subjects.has("PHILO"));
  assert.ok(subjects.has("HLP"));
});

test("distractor randomization returns four unique options and valid correct index", () => {
  const question = buildQuestionOptions(
    {
      id: "concept-1",
      correctAnswer: "Correct",
      distractors: JSON.stringify(["A", "B", "C", "D", "E"]),
    },
    "quiz-1",
    0,
  );

  assert.ok(question);
  assert.equal(question?.options.length, 4);
  assert.equal(new Set(question?.options).size, 4);
  assert.ok((question?.correctIndex ?? -1) >= 0 && (question?.correctIndex ?? -1) < 4);
  assert.equal(question?.options[question?.correctIndex ?? 0], "Correct");
});

test("signature avoidance can resample to avoid recently used signatures", () => {
  const seen = new Set<string>();
  const first = buildQuestionOptions(
    {
      id: "concept-1",
      correctAnswer: "Correct",
      distractors: JSON.stringify(["A", "B", "C", "D", "E", "F", "G"]),
    },
    "quiz-1",
    0,
  );

  assert.ok(first);
  seen.add(first!.optionSignature);

  let second = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = buildQuestionOptions(
      {
        id: "concept-1",
        correctAnswer: "Correct",
        distractors: JSON.stringify(["A", "B", "C", "D", "E", "F", "G"]),
      },
      "quiz-1",
      attempt,
    );

    if (candidate && !seen.has(candidate.optionSignature)) {
      second = candidate;
      break;
    }
  }

  assert.ok(second);
  assert.notEqual(second?.optionSignature, first?.optionSignature);
});
