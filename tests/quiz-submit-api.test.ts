import test from "node:test";
import assert from "node:assert/strict";
import { buildQuizSubmitResponse } from "@/app/api/quiz/submit/route";

const baseQuiz = {
  classId: "class-1",
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
        { questionId: "q-1", conceptId: "c-1", distribution: [50, 20, 20, 20] },
        { questionId: "q-2", conceptId: "c-2", distribution: [25, 25, 25, 25] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => baseQuiz,
    createAttempt: async () => ({ id: "a-1" }),
  });

  assert.equal(response.status, 400);
});

test("POST /api/quiz/submit rejects quiz outside student class", async () => {
  const req = new Request("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", conceptId: "c-1", distribution: [25, 25, 25, 25] },
        { questionId: "q-2", conceptId: "c-2", distribution: [25, 25, 25, 25] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => ({ ...baseQuiz, classId: "class-2" }),
    createAttempt: async () => ({ id: "a-1" }),
  });

  assert.equal(response.status, 404);
});

test("POST /api/quiz/submit returns scores and persists attempt for valid payload", async () => {
  let persisted: { userId: string; quizId: string; score: number } | null = null;

  const req = new Request("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", conceptId: "c-1", distribution: [10, 10, 70, 10] },
        { questionId: "q-2", conceptId: "c-2", distribution: [100, 0, 0, 0] },
      ],
    }),
  });

  const response = await buildQuizSubmitResponse(req, { userId: "student-1" }, {
    findStudentClass: async () => ({ classId: "class-1" }),
    findQuiz: async () => baseQuiz,
    createAttempt: async (userId, quizId, score) => {
      persisted = { userId, quizId, score };
      return { id: "a-1" };
    },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.perQuestion.length, 2);
  assert.equal(body.perQuestion[0].correctIndex, 2);
  assert.equal(typeof body.perQuestion[0].score, "number");
  assert.equal(typeof body.totalScore, "number");
  assert.deepEqual(persisted, {
    userId: "student-1",
    quizId: "quiz-1",
    score: body.totalScore,
  });
});
