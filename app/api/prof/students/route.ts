import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getProfessorClasses, getProfessorStudents } from "@/lib/prof-students";

type Session = { userId: string } | null;

export async function buildStudentsResponse(
  req: NextRequest,
  session: Session,
  deps = {
    getClasses: getProfessorClasses,
    getStudents: getProfessorStudents,
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classId = req.nextUrl.searchParams.get("classId") ?? undefined;
  const [classes, students] = await Promise.all([
    deps.getClasses(session.userId),
    deps.getStudents(session.userId, classId),
  ]);

  return NextResponse.json({ classes, students });
}

export async function GET(req: NextRequest) {
  const session = await requireRole(Role.PROF);
  return buildStudentsResponse(req, session);
}
