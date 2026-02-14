import test from "node:test";
import assert from "node:assert/strict";
import { Role, UserStatus } from "@prisma/client";
import { buildProfLoginResponse } from "@/app/api/prof/login/route";
import { buildStudentLoginResponse } from "@/app/api/student/login/route";
import { buildLogoutResponse } from "@/app/api/logout/route";

test("prof login validates required fields", async () => {
  const response = await buildProfLoginResponse({ email: "" });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Email and password are required");
});

test("prof login succeeds with active professor", async () => {
  let sessionCreated = false;
  const response = await buildProfLoginResponse(
    { email: "prof@example.com", password: "pass12345" },
    {
      findUser: async () => ({
        id: "prof-1",
        email: "prof@example.com",
        password: "hash",
        role: Role.PROF,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      verify: async () => true,
      createSession: async (userId, role) => {
        sessionCreated = true;
        assert.equal(userId, "prof-1");
        assert.equal(role, Role.PROF);
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(sessionCreated, true);
});

test("student login returns expired invite message", async () => {
  const response = await buildStudentLoginResponse(
    { email: "student@example.com", password: "pass12345" },
    {
      findUser: async () => ({
        id: "student-1",
        email: "student@example.com",
        password: "hash",
        role: Role.STUDENT,
        status: UserStatus.INVITED,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      verify: async () => true,
      findActiveInvite: async () => null,
      createSession: async () => {
        throw new Error("should not create session");
      },
    },
  );

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, "Your invitation has expired. Ask your professor to resend it");
});

test("logout destroys session", async () => {
  let cleared = false;
  const response = await buildLogoutResponse({
    removeSession: async () => {
      cleared = true;
    },
  });

  assert.equal(response.status, 200);
  assert.equal(cleared, true);
});
