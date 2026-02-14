import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { importProfessorStudents } from "@/lib/prof-students";

type Session = { userId: string } | null;

export async function buildImportStudentsResponse(
  req: Request,
  session: Session,
  deps = {
    importStudents: importProfessorStudents,
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const csvText = await file.text();
  const summary = await deps.importStudents(session.userId, csvText);

  return NextResponse.json(summary);
}

export async function POST(req: Request) {
  const session = await requireRole(Role.PROF);
  return buildImportStudentsResponse(req, session);
}
