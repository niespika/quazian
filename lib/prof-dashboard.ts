import { computePopulationStats, zMeanToNoteOn20 } from "@/lib/class-relative-grading";

export const PROFESSOR_MASTERY_THRESHOLD = 0.8;

export type DashboardStudent = {
  userId: string;
  name: string | null;
  email: string;
};

export type DashboardAttempt = {
  userId: string;
  quizId: string;
  normalizedScore: number;
  zScore: number | null;
  createdAt: Date;
};

export type DashboardStudentStats = {
  userId: string;
  zMean: number;
  noteOn20: number;
};

export type DashboardConcept = {
  id: string;
  subject: string;
  title: string;
};

export type DashboardMastery = {
  userId: string;
  conceptId: string;
  pMastery: number;
};

export type StudentSort = "finalNoteOn20_desc" | "zMean_desc" | "lastAttempt_desc";

export function normalizeProfessorDashboardSort(value?: string): StudentSort {
  if (value === "zMean_desc" || value === "lastAttempt_desc") {
    return value;
  }

  return "finalNoteOn20_desc";
}

export function resolveProfessorDashboardClassId(
  classes: Array<{ id: string }>,
  requestedClassId?: string,
): { classId: string | null; forbidden: boolean } {
  if (classes.length === 0) {
    return { classId: null, forbidden: false };
  }

  if (!requestedClassId) {
    return { classId: classes[0].id, forbidden: false };
  }

  if (classes.some((classItem) => classItem.id === requestedClassId)) {
    return { classId: requestedClassId, forbidden: false };
  }

  return { classId: null, forbidden: true };
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function getAttemptZScore(attempt: DashboardAttempt, attemptsByQuizId: Map<string, DashboardAttempt[]>) {
  if (attempt.zScore != null) {
    return attempt.zScore;
  }

  const quizAttempts = attemptsByQuizId.get(attempt.quizId) ?? [];
  const { mean, std } = computePopulationStats(quizAttempts.map((entry) => entry.normalizedScore));
  if (std === 0) {
    return 0;
  }

  return Number(((attempt.normalizedScore - mean) / std).toFixed(6));
}

export function buildProfessorDashboardData({
  students,
  attempts,
  studentStats,
  concepts,
  masteries,
  sort,
}: {
  students: DashboardStudent[];
  attempts: DashboardAttempt[];
  studentStats: DashboardStudentStats[];
  concepts: DashboardConcept[];
  masteries: DashboardMastery[];
  sort: StudentSort;
}) {
  const totalConceptsAssigned = concepts.length;
  const attemptsByQuizId = new Map<string, DashboardAttempt[]>();
  for (const attempt of attempts) {
    const bucket = attemptsByQuizId.get(attempt.quizId) ?? [];
    bucket.push(attempt);
    attemptsByQuizId.set(attempt.quizId, bucket);
  }

  const attemptsByUserId = new Map<string, DashboardAttempt[]>();
  for (const attempt of attempts) {
    const bucket = attemptsByUserId.get(attempt.userId) ?? [];
    bucket.push(attempt);
    attemptsByUserId.set(attempt.userId, bucket);
  }

  const statsByUserId = new Map(studentStats.map((stats) => [stats.userId, stats]));
  const conceptIds = new Set(concepts.map((concept) => concept.id));

  const masteryByStudent = new Map<string, Map<string, number>>();
  for (const mastery of masteries) {
    if (!conceptIds.has(mastery.conceptId)) {
      continue;
    }

    const perConcept = masteryByStudent.get(mastery.userId) ?? new Map<string, number>();
    perConcept.set(mastery.conceptId, mastery.pMastery);
    masteryByStudent.set(mastery.userId, perConcept);
  }

  const studentRows = students.map((student) => {
    const attemptsForStudent = [...(attemptsByUserId.get(student.userId) ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const lastAttempt = attemptsForStudent[0];
    const lastAttemptZScore = lastAttempt ? getAttemptZScore(lastAttempt, attemptsByQuizId) : null;

    const stats = statsByUserId.get(student.userId);
    const zMean =
      stats?.zMean ??
      (attemptsForStudent.length > 0
        ? round(
            attemptsForStudent.reduce((sum, attempt) => sum + getAttemptZScore(attempt, attemptsByQuizId), 0) /
              attemptsForStudent.length,
          )
        : null);
    const finalNoteOn20 = stats?.noteOn20 ?? (zMean == null ? null : zMeanToNoteOn20(zMean));

    const pMasteryByConcept = masteryByStudent.get(student.userId) ?? new Map<string, number>();
    const masteredCount = concepts.reduce((count, concept) => {
      const mastery = pMasteryByConcept.get(concept.id) ?? 0;
      return mastery >= PROFESSOR_MASTERY_THRESHOLD ? count + 1 : count;
    }, 0);

    return {
      userId: student.userId,
      displayName: student.name?.trim() ? student.name : student.email,
      email: student.email,
      lastAttemptDate: lastAttempt?.createdAt ?? null,
      lastNormalizedScore: lastAttempt?.normalizedScore ?? null,
      lastZScore: lastAttemptZScore == null ? null : round(lastAttemptZScore),
      zMean: zMean == null ? null : round(zMean),
      finalNoteOn20: finalNoteOn20 == null ? null : round(finalNoteOn20),
      masteredCount,
      totalConceptsAssigned,
      masteryPercent: totalConceptsAssigned === 0 ? 0 : round((masteredCount / totalConceptsAssigned) * 100),
    };
  });

  const sortedRows = [...studentRows].sort((a, b) => {
    if (sort === "zMean_desc") {
      return (b.zMean ?? -Infinity) - (a.zMean ?? -Infinity);
    }

    if (sort === "lastAttempt_desc") {
      return (b.lastAttemptDate?.getTime() ?? -Infinity) - (a.lastAttemptDate?.getTime() ?? -Infinity);
    }

    return (b.finalNoteOn20 ?? -Infinity) - (a.finalNoteOn20 ?? -Infinity);
  });

  const conceptRows = concepts
    .map((concept) => {
      let masteredStudents = 0;
      let totalPMastery = 0;

      for (const student of students) {
        const pMastery = masteryByStudent.get(student.userId)?.get(concept.id) ?? 0;
        totalPMastery += pMastery;
        if (pMastery >= PROFESSOR_MASTERY_THRESHOLD) {
          masteredStudents += 1;
        }
      }

      const studentCount = students.length;
      const masteredPercent = studentCount === 0 ? 0 : round((masteredStudents / studentCount) * 100);
      const avgPMastery = studentCount === 0 ? 0 : round(totalPMastery / studentCount);

      return {
        id: concept.id,
        subject: concept.subject,
        title: concept.title,
        masteredPercent,
        avgPMastery,
      };
    })
    .sort((a, b) => a.masteredPercent - b.masteredPercent || a.avgPMastery - b.avgPMastery || a.title.localeCompare(b.title));

  return {
    studentRows: sortedRows,
    conceptRows,
    totalConceptsAssigned,
  };
}
