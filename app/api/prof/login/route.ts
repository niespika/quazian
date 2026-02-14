import { NextResponse } from "next/server";
import { Role, UserStatus, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

type ProfLoginDeps = {
  findUser: (email: string) => Promise<User | null>;
  verify: (password: string, hash: string) => Promise<boolean>;
  createSession: (userId: string, role: Role) => Promise<void>;
};

export async function buildProfLoginResponse(
  payload: { email?: string; password?: string },
  deps: ProfLoginDeps = {
    findUser: (email) => prisma.user.findUnique({ where: { email } }),
    verify: verifyPassword,
    createSession: setSession,
  },
) {
  const { email, password } = payload;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await deps.findUser(email);
  if (!user || user.role !== Role.PROF || !user.password) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  const valid = await deps.verify(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  if (user.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ error: "Your account is not active yet" }, { status: 403 });
  }

  await deps.createSession(user.id, user.role);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  return buildProfLoginResponse(await req.json());
}
