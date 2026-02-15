import test from "node:test";
import assert from "node:assert/strict";
import { buildQuizSubmitResponse } from "@/app/api/quiz/submit/route";
import { computeQuizAttemptZScores, zMeanToNoteOn20 } from "@/lib/class-relative-grading";

type Attempt = {
  id: string;
  userId: string;
  quizId: string;
  normalizedScore: number;
  zScore: number;
  noteOn20: number;
};

test("POST /api/quiz/submit recomputes quiz z-scores and student stats on each submit", async () => {
  const quiz = {
    id: "quiz-1",
    classId: "class-1",
    weekKey: "2026-W07",
    slot: "A",
    questions: [{ id: "q-1", conceptId: "c-1", correctIndex: 0 }],
  };

  const attempts: Attempt[] = [];
  const studentStats = new Map<string, { zMean: number; noteOn20: number }>();

  async function submit(userId: string, distribution: number[]) {
    const req = new Request("http://localhost/api/quiz/submit", {
      method: "POST",
      body: JSON.stringify({
        quizId: quiz.id,
        answers: [{ questionId: "q-1", distribution }],
      }),
    });

    const response = await buildQuizSubmitResponse(req, { userId }, {
      findStudentClass: async () => ({ classId: "class-1" }),
      findQuiz: async () => quiz,
      findAttempt: async (uId, qId) => attempts.find((attempt) => attempt.userId === uId && attempt.quizId === qId) ?? null,
      persistSubmission: async (uId, qId, classId, normalizedScore) => {
        attempts.push({
          id: `${uId}-${qId}`,
          userId: uId,
          quizId: qId,
          normalizedScore,
          zScore: 0,
          noteOn20: 10,
        });

        const graded = computeQuizAttemptZScores(attempts.filter((attempt) => attempt.quizId === qId));
        for (const result of graded) {
          const attempt = attempts.find((entry) => entry.id === result.id);
          if (attempt) {
            attempt.zScore = result.zScore;
            attempt.noteOn20 = result.noteOn20;
          }
        }

        const classAttempts = attempts.filter((attempt) => classId === "class-1");
        const byStudent = new Map<string, Attempt[]>();
        for (const attempt of classAttempts) {
          const bucket = byStudent.get(attempt.userId) ?? [];
          bucket.push(attempt);
          byStudent.set(attempt.userId, bucket);
        }

        for (const [studentId, studentAttempts] of byStudent.entries()) {
          const zMean = studentAttempts.reduce((sum, attempt) => sum + attempt.zScore, 0) / studentAttempts.length;
          studentStats.set(studentId, { zMean, noteOn20: zMeanToNoteOn20(zMean) });
        }
      },
    });

    assert.equal(response.status, 200);
  }

  await submit("student-1", [100, 0, 0, 0]);
  assert.equal(attempts[0].zScore, 0);

  await submit("student-2", [0, 100, 0, 0]);
  assert.equal(attempts.length, 2);
  assert.ok(Math.abs((attempts.find((attempt) => attempt.userId === "student-1")?.zScore ?? 0) - 1) < 0.000001);
  assert.ok(Math.abs((attempts.find((attempt) => attempt.userId === "student-2")?.zScore ?? 0) + 1) < 0.000001);

  assert.ok(Math.abs((studentStats.get("student-1")?.zMean ?? 0) - 1) < 0.000001);
  assert.equal(studentStats.get("student-1")?.noteOn20, 14);
  assert.ok(Math.abs((studentStats.get("student-2")?.zMean ?? 0) + 1) < 0.000001);
  assert.equal(studentStats.get("student-2")?.noteOn20, 6);
});
