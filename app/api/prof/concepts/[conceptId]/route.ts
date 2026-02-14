import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
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
    await deps.updateConcept(session.userId, conceptId, validated.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_CLASS") {
      return NextResponse.json({ error: "You can only assign concepts to your own classes." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Concept not found." }, { status: 404 });
    }
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
    await deps.deleteConcept(session.userId, conceptId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Concept not found." }, { status: 404 });
    }
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
