import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeQuizAttemptZScores, zMeanToNoteOn20 } from "@/lib/class-relative-grading";

type Session = { userId: string } | null;

type QuizQuestionRecord = { id: string; conceptId: string; correctIndex: number };

type QuizRecord = {
  classId: string;
  weekKey: string;
  slot: string;
  questions: QuizQuestionRecord[];
};

type SubmitPayload = {
  quizId: string;
  answers: {
    questionId: string;
    distribution: number[];
  }[];
};

const DEFAULT_MASTERY = 0.5;

function isValidDistribution(distribution: number[]) {
  if (!Array.isArray(distribution) || distribution.length !== 4) {
    return false;
  }

  const allIntegersInRange = distribution.every(
    (value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= 100,
  );
  if (!allIntegersInRange) {
    return false;
  }

  return distribution.reduce((sum, value) => sum + value, 0) === 100;
}

function scoreDistribution(distribution: number[], correctIndex: number) {
  const probabilities = distribution.map((value) => value / 100);
  const squaredError = probabilities.reduce((sum, probability, index) => {
    const target = index === correctIndex ? 1 : 0;
    return sum + (probability - target) ** 2;
  }, 0);

  return 1 - squaredError;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
          weekKey: true,
          slot: true,
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
    findAttempt: async (userId: string, quizId: string) => {
      return prisma.attempt.findUnique({
        where: {
          userId_quizId: { userId, quizId },
        },
        select: { id: true },
      });
    },
    persistSubmission: async (
      userId: string,
      quizId: string,
      classId: string,
      normalizedScore: number,
      conceptProbabilities: Map<string, number>,
    ) => {
      return prisma.$transaction(async (tx) => {
        await tx.attempt.create({
          data: {
            userId,
            quizId,
            score: normalizedScore,
            normalizedScore,
          },
        });

        const quizAttempts = await tx.attempt.findMany({
          where: { quizId },
          select: {
            id: true,
            normalizedScore: true,
          },
        });

        const quizAttemptGrades = computeQuizAttemptZScores(quizAttempts);
        await Promise.all(
          quizAttemptGrades.map((attempt) =>
            tx.attempt.update({
              where: { id: attempt.id },
              data: {
                zScore: attempt.zScore,
                noteOn20: attempt.noteOn20,
              },
            }),
          ),
        );

        const classStudentZMeans = await tx.attempt.groupBy({
          by: ["userId"],
          where: {
            quiz: { classId },
          },
          _avg: {
            zScore: true,
          },
        });

        await Promise.all(
          classStudentZMeans.map((item) => {
            const zMean = item._avg.zScore ?? 0;
            return tx.studentStats.upsert({
              where: {
                userId_classId: {
                  userId: item.userId,
                  classId,
                },
              },
              create: {
                userId: item.userId,
                classId,
                zMean,
                noteOn20: zMeanToNoteOn20(zMean),
              },
              update: {
                zMean,
                noteOn20: zMeanToNoteOn20(zMean),
              },
            });
          }),
        );

        const conceptIds = [...conceptProbabilities.keys()];
        const existingMastery = await tx.conceptMastery.findMany({
          where: {
            userId,
            conceptId: { in: conceptIds },
          },
          select: { conceptId: true, pMastery: true },
        });
        const existingMasteryMap = new Map(existingMastery.map((item) => [item.conceptId, item.pMastery]));

        await Promise.all(
          conceptIds.map(async (conceptId) => {
            const pCorrect = conceptProbabilities.get(conceptId) ?? 0;
            const oldMastery = existingMasteryMap.get(conceptId) ?? DEFAULT_MASTERY;
            const nextMastery = clamp(0.9 * oldMastery + 0.1 * pCorrect, 0, 1);

            return tx.conceptMastery.upsert({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },
              create: {
                userId,
                conceptId,
                pMastery: nextMastery,
              },
              update: {
                pMastery: nextMastery,
              },
            });
          }),
        );
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

  const quiz = (await deps.findQuiz(payload.quizId)) as QuizRecord | null;
  if (!quiz || quiz.classId !== studentProfile.classId) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  const existingAttempt = await deps.findAttempt(session.userId, payload.quizId);
  if (existingAttempt) {
    return NextResponse.json({ error: "Quiz has already been submitted." }, { status: 409 });
  }

  const questions = quiz.questions;
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  if (payload.answers.length !== questions.length) {
    return NextResponse.json({ error: "Answers must include each question exactly once." }, { status: 400 });
  }

  const seenQuestionIds = new Set<string>();
  const perQuestion = [] as { questionId: string; score: number; correctIndex: number }[];
  const conceptProbabilities = new Map<string, number[]>();

  for (const answer of payload.answers) {
    if (seenQuestionIds.has(answer.questionId)) {
      return NextResponse.json({ error: "Duplicate question answer detected." }, { status: 400 });
    }

    const question = questionMap.get(answer.questionId);
    if (!question) {
      return NextResponse.json({ error: "Answer does not match quiz questions." }, { status: 400 });
    }

    if (!isValidDistribution(answer.distribution)) {
      return NextResponse.json({ error: "Each distribution must contain four integers summing to 100." }, { status: 400 });
    }

    const questionScore = scoreDistribution(answer.distribution, question.correctIndex);
    const pCorrect = answer.distribution[question.correctIndex] / 100;
    const conceptScores = conceptProbabilities.get(question.conceptId) ?? [];
    conceptScores.push(pCorrect);
    conceptProbabilities.set(question.conceptId, conceptScores);

    perQuestion.push({
      questionId: question.id,
      score: questionScore,
      correctIndex: question.correctIndex,
    });
    seenQuestionIds.add(answer.questionId);
  }

  const totalScoreRaw = perQuestion.reduce((sum, item) => sum + item.score, 0);
  const totalScoreNormalized = (totalScoreRaw / perQuestion.length) * 4;

  const averagedConceptProbabilities = new Map(
    [...conceptProbabilities.entries()].map(([conceptId, probabilities]) => {
      const meanProbability = probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length;
      return [conceptId, meanProbability];
    }),
  );

  try {
    await deps.persistSubmission(
      session.userId,
      payload.quizId,
      quiz.classId,
      totalScoreNormalized,
      averagedConceptProbabilities,
    );
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Quiz has already been submitted." }, { status: 409 });
    }

    throw error;
  }

  return NextResponse.json({
    totalScoreRaw,
    totalScoreNormalized,
    perQuestion,
  });
}

export async function POST(req: Request) {
  const session = await requireRole(Role.STUDENT);
  return buildQuizSubmitResponse(req, session);
}
