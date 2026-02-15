import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { QuizWeekClient } from "@/app/student/(protected)/quiz/week/QuizWeekClient";

type QuizResponse = {
  quizId: string;
  weekKey: string;
  slot: string;
  questions: {
    id: string;
    conceptId: string;
    subject: string;
    title: string;
    optionsJson: string[];
  }[];
};

type QuizFetchResult =
  | { status: "ok"; quiz: QuizResponse }
  | { status: "no_quiz" }
  | { status: "error" };

async function getCurrentQuiz(): Promise<QuizFetchResult> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return { status: "error" };
  }

  const response = await fetch(`${proto}://${host}/api/quiz/week`, {
    cache: "no-store",
    headers: {
      cookie: headerStore.get("cookie") ?? "",
    },
  }).catch(() => null);

  if (!response) {
    return { status: "error" };
  }

  if (response.status === 404) {
    return { status: "no_quiz" };
  }

  if (!response.ok) {
    return { status: "error" };
  }

  const body = (await response.json()) as QuizResponse;
  return { status: "ok", quiz: body };
}

export default async function StudentWeeklyQuizPage() {
  const session = await requireRole(Role.STUDENT);
  if (!session) {
    redirect("/student/login");
  }

  const quizResult = await getCurrentQuiz();

  if (quizResult.status === "no_quiz") {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl font-bold">Weekly Quiz</h1>
        <p className="mt-3 text-gray-600">No quiz available yet.</p>
      </main>
    );
  }

  if (quizResult.status === "error") {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl font-bold">Weekly Quiz</h1>
        <p className="mt-3 text-red-600">Unable to load quiz right now. Please try again shortly.</p>
      </main>
    );
  }

  return <QuizWeekClient quiz={quizResult.quiz} />;
}
