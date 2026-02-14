import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { createProfessorConcept, listProfessorConcepts, validateConceptPayload } from "@/lib/prof-concepts";

type Session = { userId: string } | null;

export async function buildConceptListResponse(
  req: NextRequest,
  session: Session,
  deps = {
    listConcepts: listProfessorConcepts,
  },
) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const classId = req.nextUrl.searchParams.get("classId") ?? undefined;
  const subject = req.nextUrl.searchParams.get("subject") ?? undefined;
  const sortParam = req.nextUrl.searchParams.get("sort");
  const sort = sortParam === "dateSeenAsc" ? "dateSeenAsc" : "dateSeenDesc";

  const concepts = await deps.listConcepts({ profId: session.userId, classId, search, subject, sort });
  return NextResponse.json({ concepts });
}

export async function buildCreateConceptResponse(
  req: Request,
  session: Session,
  deps = {
    createConcept: createProfessorConcept,
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
    const created = await deps.createConcept({ profId: session.userId, ...validated.data });
    return NextResponse.json({ conceptId: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_CLASS") {
      return NextResponse.json({ error: "You can only assign concepts to your own classes." }, { status: 403 });
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const session = await requireRole(Role.PROF);
  return buildConceptListResponse(req, session);
}

export async function POST(req: Request) {
  const session = await requireRole(Role.PROF);
  return buildCreateConceptResponse(req, session);
}
