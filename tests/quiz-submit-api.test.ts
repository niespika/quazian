import test from "node:test";
import assert from "node:assert/strict";
import { buildQuizSubmitResponse } from "@/app/api/quiz/submit/route";

const baseQuiz = {
  classId: "class-1",
  weekKey: "2026-W07",
  slot: "A",
  questions: [
    { id: "q-1", conceptId: "c-1", correctIndex: 2 },
    { id: "q-2", conceptId: "c-2", correctIndex: 0 },
  ],
};

test("POST /api/quiz/submit rejects distribution sums not equal to 100", async () => {
  const req = new Request("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", distribution: [50, 20, 20, 20] },
        { questionId: "q-2", distribution: [25, 25, 25, 25] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => baseQuiz,
    findAttempt: async () => null,
    persistSubmission: async () => undefined,
  });

  assert.equal(response.status, 400);
});

test("POST /api/quiz/submit rejects quiz outside student class", async () => {
  const req = new Request("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", distribution: [25, 25, 25, 25] },
        { questionId: "q-2", distribution: [25, 25, 25, 25] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => ({ ...baseQuiz, classId: "class-2" }),
    findAttempt: async () => null,
    persistSubmission: async () => undefined,
  });

  assert.equal(response.status, 404);
});

test("POST /api/quiz/submit rejects already submitted attempts", async () => {
  const req = new Request("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", distribution: [25, 25, 25, 25] },
        { questionId: "q-2", distribution: [25, 25, 25, 25] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => baseQuiz,
    findAttempt: async () => ({ id: "attempt-1" }),
    persistSubmission: async () => undefined,
  });

  assert.equal(response.status, 409);
});

test("POST /api/quiz/submit returns raw + normalized scores and persists mastery input", async () => {
  let persisted:
    | {
        userId: string;
        quizId: string;
        normalizedScore: number;
        conceptProbabilities: Map<string, number>;
      }
    | null = null;

  const req = new Request("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", distribution: [10, 10, 70, 10] },
        { questionId: "q-2", distribution: [100, 0, 0, 0] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => baseQuiz,
    findAttempt: async () => null,
    persistSubmission: async (userId, quizId, normalizedScore, conceptProbabilities) => {
      persisted = { userId, quizId, normalizedScore, conceptProbabilities };
    },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.perQuestion.length, 2);
  assert.equal(body.perQuestion[0].correctIndex, 2);
  assert.ok(Math.abs(body.perQuestion[0].score - 0.88) < 1e-9);
  assert.ok(Math.abs(body.perQuestion[1].score - 1) < 1e-9);
  assert.ok(Math.abs(body.totalScoreRaw - 1.88) < 1e-9);
  assert.ok(Math.abs(body.totalScoreNormalized - 3.76) < 1e-9);
  assert.equal(body.totalScoreNormalized <= 4, true);

  assert.equal(persisted?.userId, "student-1");
  assert.equal(persisted?.quizId, "quiz-1");
  assert.ok(Math.abs((persisted?.normalizedScore ?? 0) - body.totalScoreNormalized) < 1e-9);
  assert.ok(Math.abs((persisted?.conceptProbabilities.get("c-1") ?? 0) - 0.7) < 1e-9);
  assert.ok(Math.abs((persisted?.conceptProbabilities.get("c-2") ?? 0) - 1) < 1e-9);
});
