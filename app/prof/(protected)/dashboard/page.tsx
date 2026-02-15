import { Role } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildProfessorDashboardData,
  normalizeProfessorDashboardSort,
  resolveProfessorDashboardClassId,
} from "@/lib/prof-dashboard";
import { getWeekStartFromDate } from "@/lib/stats";

type DashboardPageProps = {
  searchParams: Promise<{
    classId?: string;
    sort?: string;
  }>;
};

function fmtNumber(value: number | null) {
  return value == null ? "—" : value.toFixed(2);
}

function fmtDate(value: Date | null) {
  return value == null ? "—" : value.toISOString().slice(0, 10);
}

export default async function ProfessorDashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireRole(Role.PROF);
  if (!session) {
    redirect("/prof/login");
  }

  const params = await searchParams;
  const sort = normalizeProfessorDashboardSort(params.sort);
  const classes = await prisma.class.findMany({
    where: { profId: session.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (classes.length === 0) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <h1 className="text-2xl font-bold">Professor Dashboard</h1>
        <p className="text-sm text-gray-600">Create at least one class to view progress insights.</p>
      </main>
    );
  }

  const classSelection = resolveProfessorDashboardClassId(classes, params.classId);
  if (classSelection.forbidden || !classSelection.classId) {
    notFound();
  }
  const selectedClassId = classSelection.classId;
  const weekStart = getWeekStartFromDate(new Date());

  const [students, attempts, weeklyStats, concepts, masteries] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { classId: selectedClassId },
      orderBy: { name: "asc" },
      select: {
        userId: true,
        name: true,
        user: { select: { email: true } },
      },
    }),
    prisma.attempt.findMany({
      where: { quiz: { classId: selectedClassId } },
      select: {
        userId: true,
        score: true,
        zScore: true,
        createdAt: true,
      },
    }),
    prisma.studentWeeklyStats.findMany({
      where: { classId: selectedClassId, weekStart },
      select: {
        studentId: true,
        attemptsCount: true,
        meanScore: true,
        zScore: true,
      },
    }),
    prisma.classConcept.findMany({
      where: { classId: selectedClassId },
      select: {
        concept: {
          select: {
            id: true,
            subject: true,
            title: true,
          },
        },
      },
    }),
    prisma.conceptMastery.findMany({
      where: {
        concept: { assignments: { some: { classId: selectedClassId } } },
        user: { studentProfile: { classId: selectedClassId } },
      },
      select: {
        userId: true,
        conceptId: true,
        pMastery: true,
      },
    }),
  ]);

  const dashboard = buildProfessorDashboardData({
    students: students.map((student) => ({
      userId: student.userId,
      name: student.name,
      email: student.user.email,
    })),
    attempts,
    weeklyStats,
    concepts: concepts.map((assignment) => assignment.concept),
    masteries,
    sort,
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Professor Dashboard</h1>

      <form className="rounded border p-4" method="get">
        <label htmlFor="classId" className="mb-2 block text-sm font-medium">
          Class
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select id="classId" name="classId" defaultValue={selectedClassId} className="rounded border p-2 text-sm">
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>

          <select id="sort" name="sort" defaultValue={sort} className="rounded border p-2 text-sm">
            <option value="finalNoteOn20_desc">Sort: final note (/20)</option>
            <option value="zMean_desc">Sort: zMean</option>
            <option value="lastAttempt_desc">Sort: last attempt date</option>
          </select>

          <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
            Apply
          </button>
        </div>
      </form>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Student Progress</h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Student</th>
              <th className="p-2 text-left">Last attempt</th>
              <th className="p-2 text-left">Last score</th>
              <th className="p-2 text-left">Last zScore</th>
              <th className="p-2 text-left">Weekly attempts</th>
              <th className="p-2 text-left">Weekly mean score</th>
              <th className="p-2 text-left">zMean</th>
              <th className="p-2 text-left">Final note (/20)</th>
              <th className="p-2 text-left">Mastery summary</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.studentRows.map((row) => (
              <tr key={row.userId} className="border-b align-top">
                <td className="p-2">
                  <p className="font-medium">{row.displayName}</p>
                  <p className="text-xs text-gray-500">{row.email}</p>
                </td>
                <td className="p-2">{fmtDate(row.lastAttemptDate)}</td>
                <td className="p-2">{fmtNumber(row.lastScore)}</td>
                <td className="p-2">{fmtNumber(row.lastZScore)}</td>
                <td className="p-2">{row.weeklyAttemptsCount}</td>
                <td className="p-2">{fmtNumber(row.weeklyMeanScore)}</td>
                <td className="p-2">{fmtNumber(row.zMean)}</td>
                <td className="p-2">{fmtNumber(row.finalNoteOn20)}</td>
                <td className="p-2">
                  {row.masteredCount}/{row.totalConceptsAssigned} ({row.masteryPercent.toFixed(0)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Concept difficulty / coverage</h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Concept</th>
              <th className="p-2 text-left">% mastered</th>
              <th className="p-2 text-left">Avg p_mastery</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.conceptRows.map((concept) => (
              <tr key={concept.id} className="border-b">
                <td className="p-2">
                  {concept.title} <span className="text-xs text-gray-500">({concept.subject})</span>
                </td>
                <td className="p-2">{concept.masteredPercent.toFixed(0)}%</td>
                <td className="p-2">{fmtNumber(concept.avgPMastery)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
