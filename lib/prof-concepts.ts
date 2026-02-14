import { prisma } from "@/lib/prisma";

export const MIN_DISTRACTORS = 9;

export type ConceptInput = {
  classId: string;
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string[];
  dateSeen: string;
};

export type ConceptValidationResult =
  | {
      success: true;
      data: {
        subject: string;
        classId: string;
        title: string;
        correctAnswer: string;
        distractors: string[];
        dateSeen: Date;
      };
    }
  | {
      success: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDistractors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  return [];
}

export function validateConceptPayload(payload: unknown): ConceptValidationResult {
  if (!isRecord(payload)) {
    return { success: false, error: "Invalid payload." };
  }

  const subject = normalizeString(payload.subject);
  const classId = normalizeString(payload.classId);
  const title = normalizeString(payload.title);
  const correctAnswer = normalizeString(payload.correctAnswer);
  const distractors = parseDistractors(payload.distractors);
  const dateSeenInput = normalizeString(payload.dateSeen);

  if (!classId || !subject || !title || !correctAnswer || !dateSeenInput) {
    return { success: false, error: "Missing required fields." };
  }

  if (distractors.length < MIN_DISTRACTORS) {
    return { success: false, error: `At least ${MIN_DISTRACTORS} distractors are required.` };
  }

  const dateSeen = new Date(dateSeenInput);
  if (Number.isNaN(dateSeen.getTime())) {
    return { success: false, error: "Invalid dateSeen." };
  }

  return {
    success: true,
    data: {
      subject,
      classId,
      title,
      correctAnswer,
      distractors,
      dateSeen,
    },
  };
}

export async function createProfessorConcept(input: {
  profId: string;
  classId: string;
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string[];
  dateSeen: Date;
}) {
  const ownsClass = await prisma.class.count({ where: { id: input.classId, profId: input.profId } });
  if (ownsClass === 0) {
    throw new Error("FORBIDDEN_CLASS");
  }

  return prisma.concept.create({
    data: {
      classId: input.classId,
      subject: input.subject,
      title: input.title,
      correctAnswer: input.correctAnswer,
      dateSeen: input.dateSeen,
      distractors: JSON.stringify(input.distractors),
    },
  });
}

export async function updateProfessorConcept(
  profId: string,
  conceptId: string,
  input: {
    classId: string;
    subject: string;
    title: string;
    correctAnswer: string;
    distractors: string[];
    dateSeen: Date;
  },
) {
  const ownsClass = await prisma.class.count({ where: { id: input.classId, profId } });
  if (ownsClass === 0) {
    throw new Error("FORBIDDEN_CLASS");
  }

  const result = await prisma.concept.updateMany({
    where: { id: conceptId, class: { profId } },
    data: {
      classId: input.classId,
      subject: input.subject,
      title: input.title,
      correctAnswer: input.correctAnswer,
      dateSeen: input.dateSeen,
      distractors: JSON.stringify(input.distractors),
    },
  });

  if (result.count === 0) {
    throw new Error("NOT_FOUND");
  }
}

export async function deleteProfessorConcept(profId: string, conceptId: string) {
  const result = await prisma.concept.deleteMany({ where: { id: conceptId, class: { profId } } });
  if (result.count === 0) {
    throw new Error("NOT_FOUND");
  }
}

export async function listProfessorConcepts(params: {
  profId: string;
  classId?: string;
  search?: string;
  subject?: string;
  sort?: "dateSeenAsc" | "dateSeenDesc";
}) {
  const search = params.search?.trim();
  const classId = params.classId?.trim();
  const subject = params.subject?.trim();
  const sort = params.sort === "dateSeenAsc" ? "asc" : "desc";

  const concepts = await prisma.concept.findMany({
    where: {
      class: {
        profId: params.profId,
        ...(classId ? { id: classId } : {}),
      },
      ...(search
        ? {
            title: {
              contains: search,
            },
          }
        : {}),
      ...(subject ? { subject } : {}),
    },
    orderBy: { dateSeen: sort },
    include: {
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return concepts.map((concept) => {
    let distractors: string[] = [];
    try {
      const parsed = JSON.parse(concept.distractors);
      if (Array.isArray(parsed)) {
        distractors = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      distractors = [];
    }

    return {
      id: concept.id,
      classId: concept.class.id,
      className: concept.class.name,
      subject: concept.subject,
      title: concept.title,
      correctAnswer: concept.correctAnswer,
      distractors,
      dateSeen: concept.dateSeen.toISOString(),
      createdAt: concept.createdAt.toISOString(),
    };
  });
}

export async function getProfessorConceptClasses(profId: string) {
  const [classes, mostRecentConcept] = await Promise.all([
    prisma.class.findMany({
      where: { profId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.concept.findFirst({
      where: { class: { profId } },
      orderBy: { createdAt: "desc" },
      select: { classId: true },
    }),
  ]);

  return {
    classes,
    mostRecentClassId: mostRecentConcept?.classId ?? classes[0]?.id ?? null,
  };
}
