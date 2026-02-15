import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ConceptsManager } from "@/app/prof/(protected)/concepts/ConceptsManager";

test("Concepts manager renders multi-class picker, concept table and create form labels", () => {
  const html = renderToStaticMarkup(
    <ConceptsManager
      classes={[
        { id: "class-1", name: "4A" },
        { id: "class-2", name: "4B" },
      ]}
      defaultClassId="class-1"
      concepts={[
        {
          id: "concept-1",
          classIds: ["class-1", "class-2"],
          classNames: ["4A", "4B"],
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
  assert.match(html, /Assigned classes/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Distractors \(one per line, minimum 9\)/);
  assert.match(html, /Socrates/);
  assert.match(html, /PHILO/);
  assert.match(html, /4A, 4B/);
  assert.match(html, /Edit/);
  assert.match(html, /Delete/);
});
