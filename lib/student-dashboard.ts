import { zMeanToNoteOn20 } from "@/lib/class-relative-grading";

export type DashboardSort = "subject" | "title" | "p_mastery_desc" | "p_mastery_asc";
export type DashboardFilter = "all" | "mastered" | "to_work_on";

export type MasteryConcept = {
  id: string;
  subject: string;
  title: string;
  pMastery: number;
};

export type ConceptGroup = {
  subject: string;
  concepts: MasteryConcept[];
};

export type ConceptLists = {
  mastered: ConceptGroup[];
  toWorkOn: ConceptGroup[];
};

const MASTERY_THRESHOLD = 0.7;

export function normalizeSort(value?: string): DashboardSort {
  if (value === "title" || value === "p_mastery_desc" || value === "p_mastery_asc") {
    return value;
  }
  return "subject";
}

export function normalizeFilter(value?: string): DashboardFilter {
  if (value === "mastered" || value === "to_work_on") {
    return value;
  }
  return "all";
}

export function scoreToNoteOn20(score: number | null | undefined): number | null {
  if (score == null || Number.isNaN(score)) {
    return null;
  }

  return zMeanToNoteOn20(score);
}

export function buildStudentConceptMasteryWhere(userId: string, classId: string) {
  return {
    userId,
    concept: { assignments: { some: { classId } } },
  };
}

function sortConcepts(concepts: MasteryConcept[], sort: DashboardSort) {
  return [...concepts].sort((a, b) => {
    if (sort === "title") {
      return a.title.localeCompare(b.title) || a.subject.localeCompare(b.subject);
    }

    if (sort === "p_mastery_desc") {
      return b.pMastery - a.pMastery || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title);
    }

    if (sort === "p_mastery_asc") {
      return a.pMastery - b.pMastery || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title);
    }

    return a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title);
  });
}

function groupBySubject(concepts: MasteryConcept[]): ConceptGroup[] {
  const bySubject = new Map<string, MasteryConcept[]>();

  for (const concept of concepts) {
    const bucket = bySubject.get(concept.subject) ?? [];
    bucket.push(concept);
    bySubject.set(concept.subject, bucket);
  }

  return [...bySubject.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, groupedConcepts]) => ({ subject, concepts: groupedConcepts }));
}

export function buildConceptLists(
  concepts: MasteryConcept[],
  sort: DashboardSort,
  filter: DashboardFilter,
): ConceptLists {
  const sorted = sortConcepts(concepts, sort);

  const mastered = sorted.filter((concept) => concept.pMastery >= MASTERY_THRESHOLD);
  const toWorkOn = sorted.filter((concept) => concept.pMastery < MASTERY_THRESHOLD);

  return {
    mastered: filter === "to_work_on" ? [] : groupBySubject(mastered),
    toWorkOn: filter === "mastered" ? [] : groupBySubject(toWorkOn),
  };
}
