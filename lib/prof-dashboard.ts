import { zMeanToNoteOn20 } from "@/lib/class-relative-grading";

export const PROFESSOR_MASTERY_THRESHOLD = 0.8;

export type DashboardStudent = {
  userId: string;
  name: string | null;
  email: string;
};

export type DashboardAttempt = {
  userId: string;
  score: number;
  zScore: number | null;
  createdAt: Date;
};

export type DashboardWeeklyStat = {
  studentId: string;
  attemptsCount: number;
  meanScore: number | null;
  zScore: number | null;
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

export function buildProfessorDashboardData({
  students,
  attempts,
  weeklyStats,
  concepts,
  masteries,
  sort,
}: {
  students: DashboardStudent[];
  attempts: DashboardAttempt[];
  weeklyStats: DashboardWeeklyStat[];
  concepts: DashboardConcept[];
  masteries: DashboardMastery[];
  sort: StudentSort;
}) {
  const totalConceptsAssigned = concepts.length;

  const latestAttemptByUserId = new Map<string, DashboardAttempt>();
  for (const attempt of attempts) {
    const existing = latestAttemptByUserId.get(attempt.userId);
    if (!existing || attempt.createdAt.getTime() > existing.createdAt.getTime()) {
      latestAttemptByUserId.set(attempt.userId, attempt);
    }
  }

  const weeklyStatsByUserId = new Map(weeklyStats.map((stats) => [stats.studentId, stats]));
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
    const lastAttempt = latestAttemptByUserId.get(student.userId);
    const weeklyStat = weeklyStatsByUserId.get(student.userId);
    const zMean = weeklyStat?.zScore ?? null;
    const finalNoteOn20 = zMean == null ? null : zMeanToNoteOn20(zMean);

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
      lastScore: lastAttempt?.score ?? null,
      lastZScore: lastAttempt?.zScore == null ? null : round(lastAttempt.zScore),
      weeklyAttemptsCount: weeklyStat?.attemptsCount ?? 0,
      weeklyMeanScore: weeklyStat?.meanScore == null ? null : round(weeklyStat.meanScore),
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
