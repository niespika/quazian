import { prisma } from "@/lib/prisma";

export const MIN_DISTRACTORS = 9;

export type ConceptInput = {
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
  const title = normalizeString(payload.title);
  const correctAnswer = normalizeString(payload.correctAnswer);
  const distractors = parseDistractors(payload.distractors);
  const dateSeenInput = normalizeString(payload.dateSeen);

  if (!subject || !title || !correctAnswer || !dateSeenInput) {
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
      title,
      correctAnswer,
      distractors,
      dateSeen,
    },
  };
}

export async function createProfessorConcept(input: {
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string[];
  dateSeen: Date;
}) {
  return prisma.concept.create({
    data: {
      ...input,
      distractors: JSON.stringify(input.distractors),
    },
  });
}

export async function updateProfessorConcept(
  conceptId: string,
  input: {
    subject: string;
    title: string;
    correctAnswer: string;
    distractors: string[];
    dateSeen: Date;
  },
) {
  return prisma.concept.update({
    where: { id: conceptId },
    data: {
      ...input,
      distractors: JSON.stringify(input.distractors),
    },
  });
}

export async function deleteProfessorConcept(conceptId: string) {
  return prisma.concept.delete({ where: { id: conceptId } });
}

export async function listProfessorConcepts(params: {
  search?: string;
  subject?: string;
  sort?: "dateSeenAsc" | "dateSeenDesc";
}) {
  const search = params.search?.trim();
  const subject = params.subject?.trim();
  const sort = params.sort === "dateSeenAsc" ? "asc" : "desc";

  const concepts = await prisma.concept.findMany({
    where: {
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
      subject: concept.subject,
      title: concept.title,
      correctAnswer: concept.correctAnswer,
      distractors,
      dateSeen: concept.dateSeen.toISOString(),
      createdAt: concept.createdAt.toISOString(),
    };
  });
}
