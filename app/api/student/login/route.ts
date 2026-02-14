import { NextResponse } from "next/server";
import { InvitationToken, Role, User, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

type StudentLoginDeps = {
  findUser: (email: string) => Promise<User | null>;
  verify: (password: string, hash: string) => Promise<boolean>;
  findActiveInvite: (userId: string) => Promise<InvitationToken | null>;
  createSession: (userId: string, role: Role) => Promise<void>;
};

export async function buildStudentLoginResponse(
  payload: { email?: string; password?: string },
  deps: StudentLoginDeps = {
    findUser: (email) => prisma.user.findUnique({ where: { email } }),
    verify: verifyPassword,
    findActiveInvite: (userId) =>
      prisma.invitationToken.findFirst({
        where: {
          userId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    createSession: setSession,
  },
) {
  const { email, password } = payload;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await deps.findUser(email);
  if (!user || user.role !== Role.STUDENT || !user.password) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  const valid = await deps.verify(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  if (user.status !== UserStatus.ACTIVE) {
    const activeInvite = await deps.findActiveInvite(user.id);

    return NextResponse.json(
      {
        error: activeInvite
          ? "Please activate your account using your invitation link before logging in"
          : "Your invitation has expired. Ask your professor to resend it",
      },
      { status: 403 },
    );
  }

  await deps.createSession(user.id, user.role);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  return buildStudentLoginResponse(await req.json());
}
