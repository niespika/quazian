import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ConceptsManager } from "@/app/prof/(protected)/concepts/ConceptsManager";

test("Concepts manager renders concept table and create form labels", () => {
  const html = renderToStaticMarkup(
    <ConceptsManager
      concepts={[
        {
          id: "concept-1",
          subject: "PHILO",
          title: "Socrates",
          correctAnswer: "Athens",
          distractors: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
          dateSeen: "2026-02-10T00:00:00.000Z",
        },
      ]}
    />, 
  );

  assert.match(html, /Create Concept/);
  assert.match(html, /Distractors \(one per line, minimum 9\)/);
  assert.match(html, /Socrates/);
  assert.match(html, /PHILO/);
  assert.match(html, /Edit/);
  assert.match(html, /Delete/);
});
