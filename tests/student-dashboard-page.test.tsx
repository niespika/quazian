import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardContent } from "@/app/student/(protected)/dashboard/page";

test("Student dashboard renders metrics, filters, and grouped concept sections", () => {
  const html = renderToStaticMarkup(
    <StudentDashboardContent
      latestAttempt={{ normalizedScore: 2.75, zScore: 0.9, noteOn20: 13.6 }}
      overall={{ zMean: 0.62, finalNoteOn20: 12.48 }}
      history={[
        { weekKey: "2026-W07", slot: "A", normalizedScore: 2.75, zScore: 0.9, noteOn20: 13.6 },
      ]}
      sort="subject"
      filter="all"
      concepts={[
        { id: "1", subject: "PHILO", title: "Stoicism", pMastery: 0.84 },
        { id: "2", subject: "PHILO", title: "Existentialism", pMastery: 0.64 },
        { id: "3", subject: "HLP", title: "Mitosis", pMastery: 0.41 },
      ]}
    />,
  );

  assert.match(html, /Latest quiz/);
  assert.match(html, /Overall class-relative performance/);
  assert.match(html, /Recent attempts/);
  assert.match(html, /Sort/);
  assert.match(html, /Filter/);
  assert.match(html, /Mastered/);
  assert.match(html, /To Work On/);
  assert.match(html, /PHILO/);
  assert.match(html, /HLP/);
  assert.match(html, /Stoicism/);
  assert.match(html, /Existentialism/);
  assert.match(html, /p_mastery: 84%/);
});
