import test from "node:test";
import assert from "node:assert/strict";
import { QUIZ_SUBMIT_ENDPOINT, submitQuizAttempt } from "@/lib/quiz-submit-client";

test("submitQuizAttempt posts a valid quiz payload to /api/quiz/submit and returns success", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const response = await submitQuizAttempt(
    {
      quizId: "quiz-1",
      answers: [
        { questionId: "q-1", distribution: [25, 25, 25, 25] },
        { questionId: "q-2", distribution: [0, 0, 100, 0] },
      ],
    },
    async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          totalScoreRaw: 1.9,
          totalScoreNormalized: 3.8,
          perQuestion: [
            { questionId: "q-1", score: 0.9, correctIndex: 0 },
            { questionId: "q-2", score: 1, correctIndex: 2 },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, QUIZ_SUBMIT_ENDPOINT);
  assert.notEqual(calls[0]?.url, "/api/quiz/score");
  assert.equal(calls[0]?.init?.method, "POST");

  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.deepEqual(body, {
    quizId: "quiz-1",
    answers: [
      { questionId: "q-1", distribution: [25, 25, 25, 25] },
      { questionId: "q-2", distribution: [0, 0, 100, 0] },
    ],
  });

  assert.equal(response.totalScoreNormalized, 3.8);
  assert.equal(response.perQuestion.length, 2);
});

test("submitQuizAttempt surfaces API error message for non-2xx responses", async () => {
  await assert.rejects(
    () =>
      submitQuizAttempt(
        {
          quizId: "quiz-1",
          answers: [{ questionId: "q-1", distribution: [25, 25, 25, 25] }],
        },
        async () => {
          return new Response(JSON.stringify({ error: "Quiz has already been submitted." }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        },
      ),
    /Quiz has already been submitted\./,
  );
});
