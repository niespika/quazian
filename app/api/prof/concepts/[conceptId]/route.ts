import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { deleteProfessorConcept, updateProfessorConcept, validateConceptPayload } from "@/lib/prof-concepts";

type Session = { userId: string } | null;

export async function buildUpdateConceptResponse(
  conceptId: string,
  req: Request,
  session: Session,
  deps = {
    updateConcept: updateProfessorConcept,
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const validated = validateConceptPayload(payload);

  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    await deps.updateConcept(conceptId, validated.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Concept not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function buildDeleteConceptResponse(
  conceptId: string,
  session: Session,
  deps = {
    deleteConcept: deleteProfessorConcept,
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deps.deleteConcept(conceptId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Concept not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ conceptId: string }> }) {
  const { conceptId } = await params;
  const session = await requireRole(Role.PROF);
  return buildUpdateConceptResponse(conceptId, req, session);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ conceptId: string }> }) {
  const { conceptId } = await params;
  const session = await requireRole(Role.PROF);
  return buildDeleteConceptResponse(conceptId, session);
}
