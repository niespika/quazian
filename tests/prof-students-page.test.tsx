import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfStudentsPageContent } from "@/app/prof/(protected)/students/page";
import { ImportCsvSection } from "@/app/prof/(protected)/students/ImportCsvSection";

test("Students page renders table rows and invited action", () => {
  const html = renderToStaticMarkup(
    <ProfStudentsPageContent
      classId="class-1"
      classes={[{ id: "class-1", name: "Math" }]}
      students={[
        {
          id: "student-1",
          name: "Alice",
          className: "Math",
          classId: "class-1",
          email: "alice@example.com",
          status: "invited",
          invitationLink: "/invite/token",
        },
        {
          id: "student-2",
          name: "Bob",
          className: "Math",
          classId: "class-1",
          email: "bob@example.com",
          status: "activated",
          invitationLink: null,
        },
      ]}
    />,
  );

  assert.match(html, /Students Management/);
  assert.match(html, /Filter by class/);
  assert.match(html, /Import CSV/);
  assert.match(html, /Resend Invitation/);
  assert.match(html, /activated/);
});

test("Import CSV section can render import summary and invitation links", () => {
  const html = renderToStaticMarkup(
    <ImportCsvSection
      initialSummary={{
        created: 1,
        updated: 2,
        invalidRows: [{ row: 3, reason: "Invalid email" }],
        invitationLinks: [{ email: "alice@example.com", link: "/invite/token" }],
      }}
    />,
  );

  assert.match(html, /Created: 1/);
  assert.match(html, /Updated: 2/);
  assert.match(html, /Row 3: Invalid email/);
  assert.match(html, /alice@example.com/);
  assert.match(html, /\/invite\/token/);
});
