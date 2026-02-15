import test from "node:test";
import assert from "node:assert/strict";
import { isSum100, normalizeTo100, updateDistribution } from "@/lib/probability";

test("updateDistribution keeps sum=100 by auto-adjusting last option", () => {
  const next = updateDistribution([25, 25, 25, 25], 1, 40);
  assert.deepEqual(next, [25, 40, 25, 10]);
  assert.equal(isSum100(next), true);
});

test("updateDistribution clamps values to 0..100", () => {
  assert.deepEqual(updateDistribution([25, 25, 25, 25], 0, -30), [0, 25, 25, 50]);
  assert.deepEqual(updateDistribution([25, 25, 25, 25], 0, 200), [100, 25, 25, 0]);
});

test("updateDistribution falls back to normalization when auto-adjust goes negative", () => {
  const next = updateDistribution([90, 10, 0, 0], 1, 95);
  assert.equal(isSum100(next), true);
  assert.deepEqual(next, normalizeTo100([90, 95, 0, 0]));
});

test("isSum100 identifies valid and invalid distributions", () => {
  assert.equal(isSum100([25, 25, 25, 25]), true);
  assert.equal(isSum100([50, 25, 25, 10]), false);
});
