import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "quazian_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_MAX_AGE * 1000);
}

export async function setSession(userId: string, role: Role) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt: getSessionExpiryDate(),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, `${token}.${role}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE)?.value;

  if (cookieValue) {
    const [token] = cookieValue.split(".");
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
  }

  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE)?.value;
  if (!cookieValue) return null;

  const [token, cookieRole] = cookieValue.split(".");
  if (!token || !cookieRole || !Object.values(Role).includes(cookieRole as Role)) {
    return null;
  }

  const dbSession = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!dbSession || dbSession.expiresAt < new Date()) {
    if (dbSession) {
      await prisma.session.delete({ where: { id: dbSession.id } });
    }
    return null;
  }

  if (dbSession.user.role !== cookieRole) {
    return null;
  }

  return {
    userId: dbSession.userId,
    role: dbSession.user.role,
  };
}
