import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  QuizWeekClient,
  canSubmitQuiz,
  updateQuestionDistribution,
} from "@/app/student/(protected)/quiz/week/QuizWeekClient";

const quiz = {
  quizId: "quiz-1",
  weekKey: "2026-W07",
  slot: "A",
  questions: [
    {
      id: "q-1",
      conceptId: "c-1",
      subject: "PHILO",
      title: "What is virtue?",
      optionsJson: ["A", "B", "C", "D"],
    },
  ],
};

test("quiz UI renders 4 percentage inputs per question", () => {
  const html = renderToStaticMarkup(<QuizWeekClient quiz={quiz} />);

  const count = (html.match(/type=\"number\"/g) ?? []).length;
  assert.equal(count, 4);
  assert.match(html, /Sum: 100%/);
  assert.match(html, /Submit quiz/);
});

test("editing probability updates distribution and sum indicator state", () => {
  const next = updateQuestionDistribution([[25, 25, 25, 25]], 0, 1, 40);
  assert.deepEqual(next[0], [25, 40, 25, 10]);

  const sum = next[0].reduce((acc, value) => acc + value, 0);
  assert.equal(sum, 100);
});

test("submission is blocked when any question sum is not 100", () => {
  assert.equal(canSubmitQuiz([[25, 25, 25, 25]]), true);
  assert.equal(canSubmitQuiz([[30, 30, 30, 5]]), false);
});

test("after successful submit inputs are disabled and feedback is shown", () => {
  const html = renderToStaticMarkup(
    <QuizWeekClient
      quiz={quiz}
      initialFeedback={{
        totalScoreRaw: 0.40615,
        totalScoreNormalized: 0.8123,
        perQuestion: [{ questionId: "q-1", score: 0.8123, correctIndex: 2 }],
      }}
    />,
  );

  assert.match(html, /disabled/);
  assert.match(html, /Correct/);
  assert.match(html, /Score: 0.812/);
  assert.match(html, /Total score: 0.812/);
});
