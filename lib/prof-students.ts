import { randomBytes } from "crypto";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const INVITE_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 14;

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
