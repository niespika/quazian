import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardContent } from "@/app/student/(protected)/dashboard/page";

test("Student dashboard renders metrics, filters, and grouped concept sections", () => {
  const html = renderToStaticMarkup(
    <StudentDashboardContent
      latestQuizScore={2.75}
      overallNote={16.88}
      sort="subject"
      filter="all"
      concepts={[
        { id: "1", subject: "PHILO", title: "Stoicism", pMastery: 0.84 },
        { id: "2", subject: "PHILO", title: "Existentialism", pMastery: 0.64 },
        { id: "3", subject: "HLP", title: "Mitosis", pMastery: 0.41 },
      ]}
    />,
  );

  assert.match(html, /Latest quiz score/);
  assert.match(html, /Overall note \/20/);
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
