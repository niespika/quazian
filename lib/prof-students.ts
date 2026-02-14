import { randomBytes } from "crypto";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const INVITE_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 14;

type CsvRow = {
  row: number;
  name: string;
  className: string;
  email: string;
};

export type InvalidImportRow = {
  row: number;
  reason: string;
};

export type ImportStudentsSummary = {
  created: number;
  updated: number;
  invalidRows: InvalidImportRow[];
  invitationLinks: Array<{ email: string; link: string }>;
};

export type ProfessorStudentRow = {
  id: string;
  name: string;
  className: string;
  classId: string;
  email: string;
  status: "invited" | "activated";
  invitationLink: string | null;
};

export async function getProfessorClasses(profId: string) {
  return prisma.class.findMany({
    where: { profId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getProfessorStudents(profId: string, classId?: string) {
  const students = await prisma.studentProfile.findMany({
    where: {
      class: {
        profId,
        ...(classId ? { id: classId } : {}),
      },
    },
    include: {
      user: {
        include: {
          invitations: {
            where: { usedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      class: true,
    },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  return students.map<ProfessorStudentRow>((student) => ({
    id: student.id,
    name: student.name,
    className: student.class.name,
    classId: student.classId,
    email: student.user.email,
    status: student.user.status === UserStatus.INVITED ? "invited" : "activated",
    invitationLink: student.user.invitations[0]
      ? `/invite/${student.user.invitations[0].token}`
      : null,
  }));
}

export async function regenerateStudentInvitation(profId: string, studentId: string) {
  const student = await prisma.studentProfile.findFirst({
    where: {
      id: studentId,
      class: { profId },
    },
    include: {
      user: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!student || student.user.status !== UserStatus.INVITED) {
    return null;
  }

  await prisma.invitationToken.updateMany({
    where: {
      userId: student.userId,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.invitationToken.create({
    data: {
      token,
      userId: student.userId,
      expiresAt: new Date(Date.now() + INVITE_EXPIRATION_MS),
    },
  });

  return `/invite/${token}`;
}

function splitCsvLine(line: string) {
  return line.split(",").map((part) => part.trim());
}

export function parseStudentsCsv(csvText: string): { rows: CsvRow[]; invalidRows: InvalidImportRow[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], invalidRows: [{ row: 1, reason: "CSV is empty" }] };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (headers.length !== 3 || headers[0] !== "name" || headers[1] !== "class" || headers[2] !== "email") {
    return { rows: [], invalidRows: [{ row: 1, reason: "Invalid header. Expected: name,class,email" }] };
  }

  const rows: CsvRow[] = [];
  const invalidRows: InvalidImportRow[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cols = splitCsvLine(line);

    if (cols.length !== 3) {
      invalidRows.push({ row: rowNumber, reason: "Expected 3 columns" });
      return;
    }

    const [name, className, emailRaw] = cols;
    const email = emailRaw.toLowerCase();

    if (!name) {
      invalidRows.push({ row: rowNumber, reason: "Missing name" });
      return;
    }

    if (!className) {
      invalidRows.push({ row: rowNumber, reason: "Missing class" });
      return;
    }

    if (!email || !email.includes("@")) {
      invalidRows.push({ row: rowNumber, reason: "Invalid email" });
      return;
    }

    rows.push({ row: rowNumber, name, className, email });
  });

  return { rows, invalidRows };
}

export async function importProfessorStudents(profId: string, csvText: string): Promise<ImportStudentsSummary> {
  const parsed = parseStudentsCsv(csvText);
  const summary: ImportStudentsSummary = {
    created: 0,
    updated: 0,
    invalidRows: [...parsed.invalidRows],
    invitationLinks: [],
  };

  for (const row of parsed.rows) {
    try {
      let classEntity = await prisma.class.findFirst({
        where: { profId, name: row.className },
        select: { id: true },
      });

      if (!classEntity) {
        classEntity = await prisma.class.create({
          data: {
            name: row.className,
            profId,
          },
          select: { id: true },
        });
      }

      let user = await prisma.user.findUnique({
        where: { email: row.email },
        select: { id: true, role: true, password: true },
      });

      if (user && user.role !== "STUDENT") {
        summary.invalidRows.push({ row: row.row, reason: "Email already belongs to a professor" });
        continue;
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: row.email,
            role: "STUDENT",
            status: UserStatus.INVITED,
          },
          select: { id: true, role: true, password: true },
        });
      }

      const existingProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!existingProfile) {
        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            name: row.name,
            classId: classEntity.id,
          },
        });
        summary.created += 1;
      } else {
        await prisma.studentProfile.update({
          where: { userId: user.id },
          data: {
            name: row.name,
            classId: classEntity.id,
          },
        });
        summary.updated += 1;
      }

      if (!user.password) {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.INVITED },
        });

        await prisma.invitationToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        const token = randomBytes(32).toString("hex");
        await prisma.invitationToken.create({
          data: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + INVITE_EXPIRATION_MS),
          },
        });

        summary.invitationLinks.push({ email: row.email, link: `/invite/${token}` });
      }
    } catch {
      summary.invalidRows.push({ row: row.row, reason: "Failed to import row" });
    }
  }

  return summary;
}
