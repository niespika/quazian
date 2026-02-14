import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { buildStudentsResponse } from "@/app/api/prof/students/route";
import { buildResendInvitationResponse } from "@/app/api/prof/students/[studentId]/resend/route";

test("GET /api/prof/students returns unauthorized without session", async () => {
  const req = new NextRequest("http://localhost/api/prof/students");
  const response = await buildStudentsResponse(req, null);
  assert.equal(response.status, 401);
});

test("GET /api/prof/students forwards class filter and returns data", async () => {
  const req = new NextRequest("http://localhost/api/prof/students?classId=class-1");
  const response = await buildStudentsResponse(
    req,
    { userId: "prof-1" },
    {
      getClasses: async () => [{ id: "class-1", name: "Math" }],
      getStudents: async (profId, classId) => {
        assert.equal(profId, "prof-1");
        assert.equal(classId, "class-1");
        return [
          {
            id: "student-1",
            name: "Alice",
            className: "Math",
            classId: "class-1",
            email: "alice@example.com",
            status: "invited" as const,
            invitationLink: "/invite/token",
          },
        ];
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.classes[0].name, "Math");
  assert.equal(body.students[0].email, "alice@example.com");
});

test("POST /api/prof/students/:id/resend returns link", async () => {
  const response = await buildResendInvitationResponse(
    "student-1",
    { userId: "prof-1" },
    {
      regenerate: async (profId, studentId) => {
        assert.equal(profId, "prof-1");
        assert.equal(studentId, "student-1");
        return "/invite/new-token";
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.invitationLink, "/invite/new-token");
});
