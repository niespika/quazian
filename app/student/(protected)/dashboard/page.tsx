import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  buildConceptLists,
  buildStudentConceptMasteryWhere,
  normalizeFilter,
  normalizeSort,
  scoreToNoteOn20,
  type DashboardFilter,
  type DashboardSort,
  type MasteryConcept,
} from "@/lib/student-dashboard";

type DashboardSearchParams = Promise<{ sort?: string; filter?: string }>;

type StudentDashboardPageProps = {
  searchParams?: DashboardSearchParams;
};

function formatScore(score: number | null) {
  return score == null ? "N/A" : score.toFixed(2);
}

function formatPercent(probability: number) {
  return `${Math.round(probability * 100)}%`;
}

type StudentDashboardContentProps = {
  latestAttempt: {
    score: number | null;
    zScore: number | null;
    noteOn20: number | null;
  } | null;
  overall: {
    zMean: number | null;
    finalNoteOn20: number | null;
  };
  history: {
    weekKey: string;
    slot: string;
    score: number;
    zScore: number;
    noteOn20: number;
  }[];
  concepts: MasteryConcept[];
  sort: DashboardSort;
  filter: DashboardFilter;
};

function SubjectGroupList({
  groups,
  emptyLabel,
}: {
  groups: { subject: string; concepts: MasteryConcept[] }[];
  emptyLabel: string;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.subject}>
          <h3 className="text-sm font-semibold tracking-wide text-gray-700">{group.subject}</h3>
          <ul className="mt-2 space-y-2">
            {group.concepts.map((concept) => (
              <li key={concept.id} className="rounded-md border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-900">{concept.title}</p>
                <p className="text-xs text-gray-600">p_mastery: {formatPercent(concept.pMastery)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function StudentDashboardContent({
  latestAttempt,
  overall,
  history,
  concepts,
  sort,
  filter,
}: StudentDashboardContentProps) {
  const lists = buildConceptLists(concepts, sort, filter);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Student dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Latest quiz</p>
          <p className="mt-2 text-sm text-gray-600">Score: {formatScore(latestAttempt?.score ?? null)}</p>
          <p className="mt-1 text-sm text-gray-600">z-score: {formatScore(latestAttempt?.zScore ?? null)}</p>
          <p className="mt-1 text-2xl font-bold">{formatScore(latestAttempt?.noteOn20 ?? null)} /20</p>
        </article>

        <article className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Overall class-relative performance</p>
          <p className="mt-2 text-sm text-gray-600">zMean: {formatScore(overall.zMean)}</p>
          <p className="mt-1 text-2xl font-bold">{formatScore(overall.finalNoteOn20)} /20</p>
        </article>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Recent attempts</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No attempts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {history.map((entry) => (
              <li key={`${entry.weekKey}-${entry.slot}`} className="rounded border border-gray-200 px-3 py-2">
                {entry.weekKey} / {entry.slot} — score {formatScore(entry.score)}, z {formatScore(entry.zScore)},
                note {formatScore(entry.noteOn20)}/20
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Concept mastery</h2>

        <form className="mt-4 flex flex-wrap gap-3" method="get">
          <label className="text-sm text-gray-700">
            Sort
            <select name="sort" defaultValue={sort} className="ml-2 rounded border border-gray-300 px-2 py-1">
              <option value="subject">Subject</option>
              <option value="title">Concept title</option>
              <option value="p_mastery_desc">p_mastery (high to low)</option>
              <option value="p_mastery_asc">p_mastery (low to high)</option>
            </select>
          </label>

          <label className="text-sm text-gray-700">
            Filter
            <select name="filter" defaultValue={filter} className="ml-2 rounded border border-gray-300 px-2 py-1">
              <option value="all">All</option>
              <option value="mastered">Mastered</option>
              <option value="to_work_on">To Work On</option>
            </select>
          </label>

          <button className="rounded bg-black px-3 py-1 text-sm font-medium text-white" type="submit">
            Apply
          </button>
        </form>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="mb-2 text-base font-semibold text-green-700">Mastered</h3>
            <SubjectGroupList groups={lists.mastered} emptyLabel="No mastered concepts for this filter." />
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-amber-700">To Work On</h3>
            <SubjectGroupList groups={lists.toWorkOn} emptyLabel="No concepts to work on for this filter." />
          </section>
        </div>
      </section>
    </main>
  );
}

export default async function StudentDashboardPage({ searchParams }: StudentDashboardPageProps) {
  const session = await requireRole(Role.STUDENT);
  if (!session) {
    return null;
  }

  const params = searchParams ? await searchParams : undefined;
  const sort = normalizeSort(params?.sort);
  const filter = normalizeFilter(params?.filter);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { classId: true },
  });

  if (!studentProfile) {
    return null;
  }

  const [latestAttempt, overallStats, recentAttempts, masteryRows] = await Promise.all([
    prisma.attempt.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: { score: true, zScore: true, noteOn20: true },
    }),
    prisma.studentStats.findUnique({
      where: {
        userId_classId: {
          userId: session.userId,
          classId: studentProfile.classId,
        },
      },
      select: { zMean: true, noteOn20: true },
    }),
    prisma.attempt.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        score: true,
        zScore: true,
        noteOn20: true,
        quiz: {
          select: {
            weekKey: true,
            slot: true,
          },
        },
      },
    }),
    prisma.conceptMastery.findMany({
      where: buildStudentConceptMasteryWhere(session.userId, studentProfile.classId),
      include: {
        concept: {
          select: {
            id: true,
            subject: true,
            title: true,
          },
        },
      },
    }),
  ]);

  const concepts: MasteryConcept[] = masteryRows.map((row) => ({
    id: row.concept.id,
    subject: row.concept.subject,
    title: row.concept.title,
    pMastery: row.pMastery,
  }));

  return (
    <StudentDashboardContent
      latestAttempt={latestAttempt}
      overall={{
        zMean: overallStats?.zMean ?? null,
        finalNoteOn20: overallStats?.noteOn20 ?? scoreToNoteOn20(overallStats?.zMean),
      }}
      history={recentAttempts
        .filter((attempt) => attempt.zScore != null && attempt.noteOn20 != null)
        .map((attempt) => ({
          weekKey: attempt.quiz.weekKey,
          slot: attempt.quiz.slot,
          score: attempt.score,
          zScore: attempt.zScore ?? 0,
          noteOn20: attempt.noteOn20 ?? 0,
        }))}
      concepts={concepts}
      sort={sort}
      filter={filter}
    />
  );
}
