import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Session = { userId: string } | null;

type QuizQuestionRecord = { id: string; conceptId: string; correctIndex: number };

type SubmitPayload = {
  quizId: string;
  answers: {
    questionId: string;
    conceptId: string;
    distribution: number[];
  }[];
};

function isValidDistribution(distribution: number[]) {
  if (!Array.isArray(distribution) || distribution.length !== 4) {
    return false;
  }

  const values = distribution.map((value) => Math.round(value));
  const allInRange = values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  if (!allInRange) {
    return false;
  }

  return values.reduce((sum, value) => sum + value, 0) === 100;
}

function scoreDistribution(distribution: number[], correctIndex: number) {
  const probabilities = distribution.map((value) => value / 100);
  const squaredError = probabilities.reduce((sum, probability, index) => {
    const target = index === correctIndex ? 1 : 0;
    return sum + (probability - target) ** 2;
  }, 0);

  return 1 - squaredError;
}

export async function buildQuizSubmitResponse(
  req: Request,
  session: Session,
  deps = {
    findStudentClass: async (userId: string) => {
      return prisma.studentProfile.findUnique({
        where: { userId },
        select: { classId: true },
      });
    },
    findQuiz: async (quizId: string) => {
      return prisma.quiz.findUnique({
        where: { id: quizId },
        select: {
          classId: true,
          questions: {
            select: {
              id: true,
              conceptId: true,
              correctIndex: true,
            },
          },
        },
      });
    },
    createAttempt: async (userId: string, quizId: string, score: number) => {
      return prisma.attempt.create({
        data: {
          userId,
          quizId,
          score,
        },
      });
    },
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as SubmitPayload;
  if (!payload || typeof payload.quizId !== "string" || !Array.isArray(payload.answers)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const studentProfile = await deps.findStudentClass(session.userId);
  if (!studentProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quiz = await deps.findQuiz(payload.quizId);
  if (!quiz || quiz.classId !== studentProfile.classId) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  const questions = quiz.questions as QuizQuestionRecord[];
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  if (payload.answers.length !== questions.length) {
    return NextResponse.json({ error: "Answers must include each question exactly once." }, { status: 400 });
  }

  const seenQuestionIds = new Set<string>();
  const perQuestion = [] as { questionId: string; score: number; correctIndex: number }[];

  for (const answer of payload.answers) {
    if (seenQuestionIds.has(answer.questionId)) {
      return NextResponse.json({ error: "Duplicate question answer detected." }, { status: 400 });
    }

    const question = questionMap.get(answer.questionId);
    if (!question || answer.conceptId !== question.conceptId) {
      return NextResponse.json({ error: "Answer does not match quiz questions." }, { status: 400 });
    }

    if (!isValidDistribution(answer.distribution)) {
      return NextResponse.json({ error: "Each distribution must contain four integers summing to 100." }, { status: 400 });
    }

    const roundedDistribution = answer.distribution.map((value) => Math.round(value));
    const questionScore = scoreDistribution(roundedDistribution, question.correctIndex);

    perQuestion.push({
      questionId: question.id,
      score: questionScore,
      correctIndex: question.correctIndex,
    });
    seenQuestionIds.add(answer.questionId);
  }

  const totalScore = perQuestion.reduce((sum, item) => sum + item.score, 0) / perQuestion.length;
  await deps.createAttempt(session.userId, payload.quizId, totalScore);

  return NextResponse.json({ totalScore, perQuestion });
}

export async function POST(req: Request) {
  const session = await requireRole(Role.STUDENT);
  return buildQuizSubmitResponse(req, session);
}
