export type QuizSubmitAnswer = {
  questionId: string;
  distribution: number[];
};

export type QuizSubmitPayload = {
  quizId: string;
  answers: QuizSubmitAnswer[];
};

export type QuizQuestionFeedback = {
  questionId: string;
  score: number;
  correctIndex: number;
};

export type QuizSubmitResponse = {
  totalScoreRaw: number;
  totalScoreNormalized: number;
  perQuestion: QuizQuestionFeedback[];
};

export const QUIZ_SUBMIT_ENDPOINT = "/api/quiz/submit";

export async function submitQuizAttempt(
  payload: QuizSubmitPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<QuizSubmitResponse> {
  const response = await fetchImpl(QUIZ_SUBMIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "error" in responseBody &&
      typeof (responseBody as { error?: unknown }).error === "string"
        ? (responseBody as { error: string }).error
        : "Unable to submit quiz.";

    throw new Error(message);
  }

  return responseBody as QuizSubmitResponse;
}
