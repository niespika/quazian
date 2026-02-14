import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { regenerateStudentInvitation } from "@/lib/prof-students";

type Session = { userId: string } | null;

export async function buildResendInvitationResponse(
  studentId: string,
  session: Session,
  deps = {
    regenerate: regenerateStudentInvitation,
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitationLink = await deps.regenerate(session.userId, studentId);

  if (!invitationLink) {
    return NextResponse.json({ error: "Student not found or not invited" }, { status: 404 });
  }

  return NextResponse.json({ invitationLink });
}

export async function POST(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const session = await requireRole(Role.PROF);
  const { studentId } = await params;
  return buildResendInvitationResponse(studentId, session);
}
