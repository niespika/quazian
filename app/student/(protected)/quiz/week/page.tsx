import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { QuizWeekClient } from "@/app/student/(protected)/quiz/week/QuizWeekClient";

type QuizResponse = {
  id: string;
  weekKey: string;
  slot: string;
  questions: {
    id: string;
    conceptId: string;
    subject: string;
    title: string;
    options: string[];
  }[];
};

async function getCurrentQuiz(): Promise<QuizResponse | null> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return null;
  }

  const response = await fetch(`${proto}://${host}/api/quiz/week`, {
    cache: "no-store",
    headers: {
      cookie: headerStore.get("cookie") ?? "",
    },
  }).catch(() => null);

  if (!response || response.status === 404) {
    return null;
  }

  const body = await response.json();
  if (!response.ok || body.error === "NO_QUIZ_YET") {
    return null;
  }

  return body as QuizResponse;
}

export default async function StudentWeeklyQuizPage() {
  const session = await requireRole(Role.STUDENT);
  if (!session) {
    redirect("/student/login");
  }

  const quiz = await getCurrentQuiz();

  if (!quiz) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl font-bold">Weekly Quiz</h1>
        <p className="mt-3 text-gray-600">No quiz available yet.</p>
      </main>
    );
  }

  return <QuizWeekClient quiz={quiz} />;
}
