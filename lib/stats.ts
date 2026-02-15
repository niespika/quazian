import { computePopulationStats } from "@/lib/class-relative-grading";
import { prisma } from "@/lib/prisma";

function getIsoWeekInfo(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - dayNum + 3);

  const isoYear = utcDate.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((utcDate.getTime() - firstThursday.getTime()) / 604800000);
  return {
    isoYear,
    week,
    weekKey: `${isoYear}-W${String(week).padStart(2, "0")}`,
  };
}

export function getWeekStartFromDate(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - dayNum);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

export function getWeekStartFromIsoWeekKey(weekKey: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) {
    throw new Error(`Invalid ISO week key: ${weekKey}`);
  }

  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day);

  const weekStart = new Date(mondayWeek1);
  weekStart.setUTCDate(mondayWeek1.getUTCDate() + (isoWeek - 1) * 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  return weekStart;
}

export async function recomputeWeeklyStatsForClass({ classId, weekStart }: { classId: string; weekStart: Date }) {
  const normalizedWeekStart = getWeekStartFromDate(weekStart);
  const { weekKey } = getIsoWeekInfo(normalizedWeekStart);

  const grouped = await prisma.attempt.groupBy({
    by: ["userId"],
    where: {
      quiz: {
        classId,
        weekKey,
      },
    },
    _count: {
      _all: true,
    },
    _avg: {
      score: true,
    },
  });

  if (grouped.length === 0) {
    await prisma.studentWeeklyStats.deleteMany({
      where: {
        classId,
        weekStart: normalizedWeekStart,
      },
    });
    return;
  }

  const studentMeans = grouped.map((row) => row._avg.score ?? 0);
  const { mean: classMean, std: classStdDev } = computePopulationStats(studentMeans);

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      grouped.map((row) => {
        const meanScore = row._avg.score;
        const zScore =
          meanScore == null || classStdDev === 0 ? 0 : Number(((meanScore - classMean) / classStdDev).toFixed(6));

        return tx.studentWeeklyStats.upsert({
          where: {
            weekStart_classId_studentId: {
              weekStart: normalizedWeekStart,
              classId,
              studentId: row.userId,
            },
          },
          create: {
            weekStart: normalizedWeekStart,
            classId,
            studentId: row.userId,
            attemptsCount: row._count._all,
            meanScore,
            zScore,
          },
          update: {
            attemptsCount: row._count._all,
            meanScore,
            zScore,
          },
        });
      }),
    );

    await tx.studentWeeklyStats.deleteMany({
      where: {
        classId,
        weekStart: normalizedWeekStart,
        studentId: {
          notIn: grouped.map((row) => row.userId),
        },
      },
    });
  });
}
