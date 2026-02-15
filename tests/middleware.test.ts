import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

test("middleware redirects unauthenticated professor route", () => {
  const request = new NextRequest("http://localhost/prof/students");
  const response = middleware(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/prof/login");
});

test("middleware allows authenticated professor route", () => {
  const request = new NextRequest("http://localhost/prof/students", {
    headers: {
      cookie: "quazian_session=abc.PROF",
    },
  });

  const response = middleware(request);
  assert.equal(response.status, 200);
});

test("middleware redirects unauthenticated student route", () => {
  const request = new NextRequest("http://localhost/student/dashboard");
  const response = middleware(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/student/login");
});

test("middleware blocks student role from professor dashboard", () => {
  const request = new NextRequest("http://localhost/prof/dashboard", {
    headers: {
      cookie: "quazian_session=abc.STUDENT",
    },
  });

  const response = middleware(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/prof/login");
});
