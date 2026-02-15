import test from "node:test";
import assert from "node:assert/strict";
import { computeQuizAttemptZScores, zMeanToNoteOn20 } from "@/lib/class-relative-grading";

test("computeQuizAttemptZScores computes z-scores when std > 0", () => {
  const results = computeQuizAttemptZScores([
    { id: "a1", normalizedScore: 1 },
    { id: "a2", normalizedScore: 2 },
    { id: "a3", normalizedScore: 3 },
  ]);

  assert.equal(results.length, 3);
  assert.ok(Math.abs(results[0].zScore + 1.224745) < 0.000001);
  assert.ok(Math.abs(results[1].zScore - 0) < 0.000001);
  assert.ok(Math.abs(results[2].zScore - 1.224745) < 0.000001);
});

test("computeQuizAttemptZScores returns z=0 when all scores are equal", () => {
  const results = computeQuizAttemptZScores([
    { id: "a1", normalizedScore: 2 },
    { id: "a2", normalizedScore: 2 },
  ]);

  assert.deepEqual(results.map((item) => item.zScore), [0, 0]);
});

test("computeQuizAttemptZScores returns z=0 for single attempt", () => {
  const [result] = computeQuizAttemptZScores([{ id: "a1", normalizedScore: 1.5 }]);
  assert.equal(result.zScore, 0);
});

test("zMeanToNoteOn20 maps key values and clamps", () => {
  assert.equal(zMeanToNoteOn20(0), 10);
  assert.equal(zMeanToNoteOn20(1), 14);
  assert.equal(zMeanToNoteOn20(-1), 6);
  assert.equal(zMeanToNoteOn20(10), 20);
  assert.equal(zMeanToNoteOn20(-10), 0);
});
