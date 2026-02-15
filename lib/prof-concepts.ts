import { prisma } from "@/lib/prisma";

export const MIN_DISTRACTORS = 9;

export type ConceptInput = {
  classIds: string[];
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
        classIds: string[];
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

function parseClassIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))];
  }

  const classId = normalizeString(value);
  return classId ? [classId] : [];
}

export function validateConceptPayload(payload: unknown): ConceptValidationResult {
  if (!isRecord(payload)) {
    return { success: false, error: "Invalid payload." };
  }

  const subject = normalizeString(payload.subject);
  const classIds = parseClassIds(payload.classIds ?? payload.classId);
  const title = normalizeString(payload.title);
  const correctAnswer = normalizeString(payload.correctAnswer);
  const distractors = parseDistractors(payload.distractors);
  const dateSeenInput = normalizeString(payload.dateSeen);

  if (classIds.length === 0 || !subject || !title || !correctAnswer || !dateSeenInput) {
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
      classIds,
      title,
      correctAnswer,
      distractors,
      dateSeen,
    },
  };
}

async function ensureProfessorOwnsClasses(profId: string, classIds: string[]) {
  const count = await prisma.class.count({ where: { id: { in: classIds }, profId } });
  if (count !== classIds.length) {
    throw new Error("FORBIDDEN_CLASS");
  }
}

export async function createProfessorConcept(input: {
  profId: string;
  classIds: string[];
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string[];
  dateSeen: Date;
}) {
  await ensureProfessorOwnsClasses(input.profId, input.classIds);

  return prisma.concept.create({
    data: {
      profId: input.profId,
      subject: input.subject,
      title: input.title,
      correctAnswer: input.correctAnswer,
      dateSeen: input.dateSeen,
      distractors: JSON.stringify(input.distractors),
      assignments: {
        create: input.classIds.map((classId) => ({ classId })),
      },
    },
  });
}

export async function updateProfessorConcept(
  profId: string,
  conceptId: string,
  input: {
    classIds: string[];
    subject: string;
    title: string;
    correctAnswer: string;
    distractors: string[];
    dateSeen: Date;
  },
) {
  await ensureProfessorOwnsClasses(profId, input.classIds);

  const result = await prisma.concept.updateMany({
    where: { id: conceptId, profId },
    data: {
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

  await prisma.classConcept.deleteMany({ where: { conceptId } });
  await prisma.classConcept.createMany({ data: input.classIds.map((classId) => ({ classId, conceptId })) });
}

export async function deleteProfessorConcept(profId: string, conceptId: string) {
  const result = await prisma.concept.deleteMany({ where: { id: conceptId, profId } });
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
      profId: params.profId,
      ...(classId ? { assignments: { some: { classId } } } : {}),
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
      assignments: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
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

    const classes = concept.assignments
      .map((assignment) => assignment.class)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: concept.id,
      classIds: classes.map((item) => item.id),
      classNames: classes.map((item) => item.name),
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
      where: { profId },
      orderBy: { createdAt: "desc" },
      select: {
        assignments: {
          take: 1,
          orderBy: { assignedAt: "desc" },
          select: { classId: true },
        },
      },
    }),
  ]);

  return {
    classes,
    mostRecentClassId: mostRecentConcept?.assignments[0]?.classId ?? classes[0]?.id ?? null,
  };
}
