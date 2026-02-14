import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function buildLogoutResponse(deps = { removeSession: clearSession }) {
  await deps.removeSession();
  return NextResponse.json({ ok: true });
}

export async function POST() {
  return buildLogoutResponse();
}
