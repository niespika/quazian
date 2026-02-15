import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizWeekClient } from "@/app/student/(protected)/quiz/week/QuizWeekClient";

test("quiz UI renders 4 percentage inputs per question", () => {
  const html = renderToStaticMarkup(
    <QuizWeekClient
      quiz={{
        id: "quiz-1",
        weekKey: "2026-W07",
        slot: "A",
        questions: [
          {
            id: "q-1",
            conceptId: "c-1",
            subject: "PHILO",
            title: "What is virtue?",
            options: ["A", "B", "C", "D"],
          },
        ],
      }}
    />,
  );

  const count = (html.match(/type="number"/g) ?? []).length;
  assert.equal(count, 4);
  assert.match(html, /Sum: 100%/);
  assert.match(html, /Submit quiz/);
});
