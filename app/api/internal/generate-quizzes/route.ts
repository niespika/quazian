import { NextResponse } from "next/server";
import { generateQuizzesForCurrentSlot } from "@/lib/quiz-generation";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateQuizzesForCurrentSlot();
  return NextResponse.json(result);
}
