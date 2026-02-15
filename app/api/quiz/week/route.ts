import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekSlot } from "@/lib/quiz-generation";

export async function GET() {
  const session = await requireRole(Role.STUDENT);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { classId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weekKey, slot } = getCurrentWeekSlot();
  const quiz = await prisma.quiz.findUnique({
    where: {
      classId_weekKey_slot: {
        classId: profile.classId,
        weekKey,
        slot,
      },
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          conceptId: true,
          order: true,
          subject: true,
          title: true,
          optionsJson: true,
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "NO_QUIZ_YET" }, { status: 404 });
  }

  return NextResponse.json({
    quizId: quiz.id,
    weekKey: quiz.weekKey,
    slot: quiz.slot,
    createdAt: quiz.createdAt.toISOString(),
    questions: quiz.questions.map((question) => ({
      id: question.id,
      conceptId: question.conceptId,
      order: question.order,
      subject: question.subject,
      title: question.title,
      optionsJson: JSON.parse(question.optionsJson) as string[],
    })),
  });
}
