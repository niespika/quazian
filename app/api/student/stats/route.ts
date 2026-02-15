import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireRole(Role.STUDENT);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { classId: true },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, attempts] = await Promise.all([
    prisma.studentStats.findUnique({
      where: {
        userId_classId: {
          userId: session.userId,
          classId: studentProfile.classId,
        },
      },
      select: {
        zMean: true,
        noteOn20: true,
      },
    }),
    prisma.attempt.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        createdAt: true,
        normalizedScore: true,
        zScore: true,
        noteOn20: true,
        quiz: {
          select: {
            weekKey: true,
            slot: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    finalNoteOn20: stats?.noteOn20 ?? null,
    zMean: stats?.zMean ?? null,
    attempts: attempts.map((attempt) => ({
      createdAt: attempt.createdAt,
      weekKey: attempt.quiz.weekKey,
      slot: attempt.quiz.slot,
      score: attempt.normalizedScore,
      z: attempt.zScore,
      noteOn20: attempt.noteOn20,
    })),
  });
}
