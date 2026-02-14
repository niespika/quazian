import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfStudentsPageContent } from "@/app/prof/students/page";

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
  assert.match(html, /Resend Invitation/);
  assert.match(html, /activated/);
});
