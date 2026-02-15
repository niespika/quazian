"use client";

import { useMemo, useState } from "react";
import { isSum100, updateDistribution, type Distribution } from "@/lib/probability";
import { submitQuizAttempt, type QuizSubmitResponse } from "@/lib/quiz-submit-client";

type QuizQuestion = {
  id: string;
  conceptId: string;
  subject: string;
  title: string;
  optionsJson: string[];
};

type QuizPayload = {
  quizId: string;
  weekKey: string;
  slot: string;
  questions: QuizQuestion[];
};

type QuizWeekClientProps = {
  quiz: QuizPayload;
  initialDistributions?: Distribution[];
  initialFeedback?: QuizSubmitResponse | null;
};

export function buildInitialDistributions(questionCount: number, initialDistributions?: Distribution[]) {
  if (initialDistributions && initialDistributions.length === questionCount) {
    return initialDistributions;
  }

  return Array.from({ length: questionCount }, () => [25, 25, 25, 25] as Distribution);
}

export function updateQuestionDistribution(
  current: Distribution[],
  questionIndex: number,
  optionIndex: number,
  nextValue: number,
) {
  const next = [...current];
  next[questionIndex] = updateDistribution(current[questionIndex], optionIndex, nextValue);
  return next;
}

export function canSubmitQuiz(distributions: Distribution[]) {
  return distributions.every((distribution) => isSum100(distribution));
}

export function QuizWeekClient({ quiz, initialDistributions, initialFeedback = null }: QuizWeekClientProps) {
  const [distributions, setDistributions] = useState<Distribution[]>(
    buildInitialDistributions(quiz.questions.length, initialDistributions),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<QuizSubmitResponse | null>(initialFeedback);

  const allSumsValid = useMemo(() => canSubmitQuiz(distributions), [distributions]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allSumsValid) {
      setError("Each question must sum to exactly 100%.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const answers = quiz.questions.map((question, index) => ({
      questionId: question.id,
      distribution: distributions[index],
    }));

    try {
      const body = await submitQuizAttempt({ quizId: quiz.quizId, answers });
      setFeedback(body);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">Weekly Quiz</h1>
        <p className="text-sm text-gray-600">
          Week: {quiz.weekKey} {quiz.slot ? `• ${quiz.slot}` : ""}
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {quiz.questions.map((question, questionIndex) => {
          const distribution = distributions[questionIndex];
          const sum = distribution.reduce((acc, value) => acc + value, 0);
          const questionFeedback = feedback?.perQuestion.find((item) => item.questionId === question.id);

          return (
            <section key={question.id} className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold">{question.subject}</h2>
              <p className="mt-1 font-medium">{question.title}</p>

              <div className="mt-4 grid gap-3">
                {question.optionsJson.slice(0, 4).map((option, optionIndex) => {
                  const isCorrect = questionFeedback?.correctIndex === optionIndex;
                  const percent = distribution[optionIndex];

                  return (
                    <label key={optionIndex} className="grid gap-1 text-sm text-gray-800">
                      <span className={isCorrect ? "font-semibold text-green-700" : undefined}>
                        {String.fromCharCode(65 + optionIndex)}. {option} {isCorrect ? "(Correct)" : null}
                      </span>
                      <input
                        aria-label={`${question.title}-option-${optionIndex}`}
                        type="number"
                        min={0}
                        max={100}
                        value={percent}
                        disabled={Boolean(feedback) || submitting}
                        onChange={(event) => {
                          const nextValue = Number.parseInt(event.target.value, 10);
                          setDistributions((current) =>
                            updateQuestionDistribution(current, questionIndex, optionIndex, nextValue),
                          );
                        }}
                        className="w-24 rounded border border-gray-300 px-2 py-1"
                      />
                      <div className="h-2 w-full rounded bg-gray-100">
                        <div className="h-2 rounded bg-blue-500" style={{ width: `${percent}%` }} />
                      </div>
                    </label>
                  );
                })}
              </div>

              <p className={`mt-3 text-sm font-semibold ${sum === 100 ? "text-green-700" : "text-red-600"}`}>Sum: {sum}%</p>

              {questionFeedback ? <p className="mt-2 text-sm text-gray-700">Score: {questionFeedback.score.toFixed(3)}</p> : null}
            </section>
          );
        })}

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        {feedback ? (
          <p className="text-lg font-bold">Total score: {feedback.totalScoreNormalized.toFixed(3)}</p>
        ) : (
          <button
            type="submit"
            disabled={submitting || !allSumsValid}
            className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? "Submitting..." : "Submit quiz"}
          </button>
        )}
      </form>
    </main>
  );
}
