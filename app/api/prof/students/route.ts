import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function parseCsv(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [name, className, email] = line.split(",").map((v) => v?.trim());
      return { name, className, email };
    })
    .filter((row) => row.name && row.className && row.email);
}

export async function GET() {
  const session = await requireRole(Role.PROF);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await prisma.studentProfile.findMany({
    where: { class: { profId: session.userId } },
    include: {
      user: {
        include: {
          invitations: {
            where: { usedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      class: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    students: students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.user.email,
      className: student.class.name,
      status: student.user.status,
      invitationLink: student.user.invitations[0]
        ? `/invite/${student.user.invitations[0].token}`
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireRole(Role.PROF);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.formData();
  const file = data.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const rows = parseCsv(await file.text());
  const links: Array<{ name: string; email: string; link: string }> = [];

  for (const row of rows) {
    const classRecord = await prisma.class.upsert({
      where: {
        id: `${session.userId}-${row.className}`,
      },
      update: {},
      create: {
        id: `${session.userId}-${row.className}`,
        name: row.className,
        profId: session.userId,
      },
    });

    const user = await prisma.user.upsert({
      where: { email: row.email },
      update: {
        role: Role.STUDENT,
        status: UserStatus.INVITED,
        password: null,
      },
      create: {
        email: row.email,
        role: Role.STUDENT,
        status: UserStatus.INVITED,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { name: row.name, classId: classRecord.id },
      create: {
        userId: user.id,
        classId: classRecord.id,
        name: row.name,
      },
    });

    await prisma.invitationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomUUID();
    await prisma.invitationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });

    links.push({ name: row.name, email: row.email, link: `/invite/${token}` });
  }

  return NextResponse.json({ imported: rows.length, links });
}
