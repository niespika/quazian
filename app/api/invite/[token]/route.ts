import { NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.invitationToken.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    email: invite.user.email,
    name: invite.user.studentProfile?.name,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { password } = await req.json();

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const invite = await prisma.invitationToken.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation token is invalid or expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: {
        password: passwordHash,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.invitationToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
