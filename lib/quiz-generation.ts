import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TIME_ZONE = "America/Montreal";
const QUIZ_MIN_CONCEPTS = 4;
const QUIZ_MAX_CONCEPTS = 10;
const RECENT_SIGNATURE_QUIZ_COUNT = 4;

type ConceptForSelection = {
  id: string;
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string;
  dateSeen: Date;
  avgMastery: number | null;
};

export type QuizSlot = "A" | "B";

function getWeekdayInTimeZone(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TIME_ZONE,
  }).format(date);

  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return map[weekday] ?? 1;
}

function getTimeZoneDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function getIsoWeekKeyFromParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000);

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function getSlotStart(date: Date, slot: QuizSlot) {
  const weekday = getWeekdayInTimeZone(date);
  const deltaDays = slot === "A" ? weekday - 1 : weekday - 4;
  return new Date(date.getTime() - deltaDays * 24 * 60 * 60 * 1000);
}

function getPreviousSlotStart(date: Date, slot: QuizSlot) {
  if (slot === "B") {
    return new Date(getSlotStart(date, "B").getTime() - 3 * 24 * 60 * 60 * 1000);
  }

  return new Date(getSlotStart(date, "A").getTime() - 4 * 24 * 60 * 60 * 1000);
}

export function getCurrentWeekSlot(now = new Date()) {
  const { year, month, day } = getTimeZoneDateParts(now);
  const weekKey = getIsoWeekKeyFromParts(year, month, day);
  const weekday = getWeekdayInTimeZone(now);
  const slot: QuizSlot = weekday <= 3 ? "A" : "B";

  return { weekKey, slot };
}

function createSeededRng(seed: string) {
  let state = createHash("sha256").update(seed).digest().readUInt32BE(0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function parseDistractors(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
    }
  } catch {
    return [];
  }

  return [];
}

function sampleUnique(items: string[], count: number, rng: () => number) {
  const pool = [...items];
  const selected: string[] = [];
  while (pool.length > 0 && selected.length < count) {
    const idx = Math.floor(rng() * pool.length);
    const [picked] = pool.splice(idx, 1);
    selected.push(picked);
  }
  return selected;
}

function shuffle<T>(items: T[], rng: () => number) {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function selectConceptsForQuiz(
  concepts: ConceptForSelection[],
  now: Date,
  lastSlotBoundary?: Date,
) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoff = lastSlotBoundary && lastSlotBoundary > sevenDaysAgo ? lastSlotBoundary : sevenDaysAgo;

  const newConcepts = concepts.filter((concept) => concept.dateSeen >= cutoff);
  const fragileConcepts = concepts.filter(
    (concept) => concept.avgMastery !== null && concept.avgMastery >= 0.5 && concept.avgMastery < 0.85,
  );
  const unmasteredConcepts = concepts.filter((concept) => concept.avgMastery === null || concept.avgMastery < 0.8);

  const picked: ConceptForSelection[] = [];
  const seen = new Set<string>();
  const pushUnique = (list: ConceptForSelection[]) => {
    for (const concept of list) {
      if (!seen.has(concept.id) && picked.length < QUIZ_MAX_CONCEPTS) {
        seen.add(concept.id);
        picked.push(concept);
      }
    }
  };

  pushUnique(newConcepts);
  pushUnique(fragileConcepts);
  pushUnique(unmasteredConcepts);
  pushUnique(concepts);

  let selected = picked.slice(0, Math.min(QUIZ_MAX_CONCEPTS, concepts.length));

  const ensureSubject = (subject: string) => {
    if (selected.some((concept) => concept.subject === subject)) {
      return;
    }

    const candidate = concepts.find((concept) => concept.subject === subject);
    if (!candidate) {
      return;
    }

    if (selected.length < QUIZ_MAX_CONCEPTS) {
      selected = [...selected, candidate];
      return;
    }

    const replaceIndex = selected.findIndex((concept) => concept.subject !== subject);
    if (replaceIndex >= 0) {
      selected[replaceIndex] = candidate;
    }
  };

  ensureSubject("PHILO");
  ensureSubject("HLP");

  if (selected.length > QUIZ_MAX_CONCEPTS) {
    selected = selected.slice(0, QUIZ_MAX_CONCEPTS);
  }

  if (selected.length < QUIZ_MIN_CONCEPTS) {
    return concepts.slice(0, Math.min(QUIZ_MIN_CONCEPTS, concepts.length));
  }

  return selected;
}

export function buildQuestionOptions(
  concept: Pick<ConceptForSelection, "id" | "correctAnswer" | "distractors">,
  quizId: string,
  salt: number,
) {
  const rng = createSeededRng(`${quizId}:${concept.id}:${salt}`);
  const distractorPool = parseDistractors(concept.distractors).filter((item) => item !== concept.correctAnswer);
  const distractors = sampleUnique(distractorPool, 3, rng);

  if (distractors.length < 3) {
    return null;
  }

  const options = shuffle([concept.correctAnswer, ...distractors], rng);
  const uniqueOptions = [...new Set(options)];

  if (uniqueOptions.length !== 4) {
    return null;
  }

  const correctIndex = options.findIndex((item) => item === concept.correctAnswer);
  if (correctIndex < 0) {
    return null;
  }

  return {
    options,
    correctIndex,
    optionSignature: createHash("sha256").update(`${concept.id}:${options.join("|")}`).digest("hex"),
  };
}

export async function generateQuizForClass(classId: string, weekKey: string, slot: QuizSlot) {
  const now = new Date();
  const previousSlotBoundary = getPreviousSlotStart(now, slot);

  return prisma.$transaction(async (tx) => {
    const quiz = await tx.quiz.upsert({
      where: {
        classId_weekKey_slot: { classId, weekKey, slot },
      },
      update: {},
      create: { classId, weekKey, slot },
    });

    const existingCount = await tx.quizQuestion.count({ where: { quizId: quiz.id } });
    if (existingCount > 0) {
      return tx.quiz.findUnique({
        where: { id: quiz.id },
        include: { questions: { orderBy: { order: "asc" } } },
      });
    }

    const assignedConcepts = await tx.classConcept.findMany({
      where: { classId },
      include: {
        concept: {
          include: {
            masteries: {
              where: {
                user: {
                  studentProfile: {
                    classId,
                  },
                },
              },
              select: {
                pMastery: true,
              },
            },
          },
        },
      },
    });

    const concepts: ConceptForSelection[] = assignedConcepts.map((item) => {
      const masteryValues = item.concept.masteries.map((mastery) => mastery.pMastery);
      const avgMastery = masteryValues.length
        ? masteryValues.reduce((sum, value) => sum + value, 0) / masteryValues.length
        : null;

      return {
        id: item.concept.id,
        subject: item.concept.subject,
        title: item.concept.title,
        correctAnswer: item.concept.correctAnswer,
        distractors: item.concept.distractors,
        dateSeen: item.concept.dateSeen,
        avgMastery,
      };
    });

    if (concepts.length === 0) {
      return tx.quiz.findUnique({ where: { id: quiz.id }, include: { questions: true } });
    }

    const selectedConcepts = selectConceptsForQuiz(concepts, now, previousSlotBoundary);

    const recentQuizzes = await tx.quiz.findMany({
      where: {
        classId,
        id: { not: quiz.id },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_SIGNATURE_QUIZ_COUNT,
      select: { id: true },
    });

    const recentSignatures = await tx.quizQuestion.findMany({
      where: {
        quizId: { in: recentQuizzes.map((item) => item.id) },
      },
      select: {
        conceptId: true,
        optionSignature: true,
      },
    });

    const signatureMap = new Map<string, Set<string>>();
    for (const row of recentSignatures) {
      const key = `${classId}:${row.conceptId}`;
      const set = signatureMap.get(key) ?? new Set<string>();
      set.add(row.optionSignature);
      signatureMap.set(key, set);
    }

    const questions = selectedConcepts
      .map((concept, index) => {
        const seenSignatures = signatureMap.get(`${classId}:${concept.id}`) ?? new Set<string>();
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const built = buildQuestionOptions(concept, quiz.id, attempt);
          if (!built) {
            continue;
          }

          if (seenSignatures.has(built.optionSignature)) {
            continue;
          }

          return {
            quizId: quiz.id,
            conceptId: concept.id,
            order: index,
            subject: concept.subject,
            title: concept.title,
            optionsJson: JSON.stringify(built.options),
            correctIndex: built.correctIndex,
            optionSignature: built.optionSignature,
          };
        }

        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (questions.length > 0) {
      await tx.quizQuestion.createMany({ data: questions });
    }

    return tx.quiz.findUnique({
      where: { id: quiz.id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });
}

export async function generateQuizzesForCurrentSlot() {
  const { weekKey, slot } = getCurrentWeekSlot();
  const classes = await prisma.class.findMany({ select: { id: true } });

  for (const classEntity of classes) {
    await generateQuizForClass(classEntity.id, weekKey, slot);
  }

  return { generated: classes.length, weekKey, slot };
}
