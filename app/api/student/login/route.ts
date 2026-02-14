import { NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== Role.STUDENT || !user.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid || user.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSession(user.id, user.role);
  return NextResponse.json({ ok: true });
}
