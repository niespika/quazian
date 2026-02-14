import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const SESSION_COOKIE = "quazian_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function secret() {
  return process.env.SESSION_SECRET ?? "dev-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function encode(data: object) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      role: Role;
    };
  } catch {
    return null;
  }
}

export async function setSession(userId: string, role: Role) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encode({ userId, role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decode(token);
}
