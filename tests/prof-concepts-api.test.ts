import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { buildConceptListResponse, buildCreateConceptResponse } from "@/app/api/prof/concepts/route";
import { buildUpdateConceptResponse } from "@/app/api/prof/concepts/[conceptId]/route";

const validPayload = {
  subject: "PHILO",
  title: "Socrates",
  correctAnswer: "Athens",
  distractors: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
  dateSeen: "2026-02-10",
};

test("GET /api/prof/concepts returns unauthorized without session", async () => {
  const req = new NextRequest("http://localhost/api/prof/concepts");
  const response = await buildConceptListResponse(req, null);
  assert.equal(response.status, 401);
});

test("GET /api/prof/concepts forwards filters and sort", async () => {
  const req = new NextRequest("http://localhost/api/prof/concepts?search=soc&subject=PHILO&sort=dateSeenAsc");
  const response = await buildConceptListResponse(
    req,
    { userId: "prof-1" },
    {
      listConcepts: async (params) => {
        assert.equal(params.search, "soc");
        assert.equal(params.subject, "PHILO");
        assert.equal(params.sort, "dateSeenAsc");
        return [{ ...validPayload, id: "c-1", dateSeen: "2026-02-10T00:00:00.000Z", createdAt: "2026-02-10T00:00:00.000Z" }];
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.concepts[0].id, "c-1");
});

test("POST /api/prof/concepts validates distractors count", async () => {
  const req = new Request("http://localhost/api/prof/concepts", {
    method: "POST",
    body: JSON.stringify({ ...validPayload, distractors: ["a", "b"] }),
  });

  const response = await buildCreateConceptResponse(req, { userId: "prof-1" });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /At least 9 distractors/);
});

test("POST /api/prof/concepts validates invalid date", async () => {
  const req = new Request("http://localhost/api/prof/concepts", {
    method: "POST",
    body: JSON.stringify({ ...validPayload, dateSeen: "not-a-date" }),
  });

  const response = await buildCreateConceptResponse(req, { userId: "prof-1" });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Invalid dateSeen/);
});

test("PUT /api/prof/concepts/:id validates missing fields", async () => {
  const req = new Request("http://localhost/api/prof/concepts/c-1", {
    method: "PUT",
    body: JSON.stringify({ ...validPayload, title: "" }),
  });

  const response = await buildUpdateConceptResponse("c-1", req, { userId: "prof-1" });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Missing required fields/);
});
