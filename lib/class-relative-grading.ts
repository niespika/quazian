export type AttemptScore = {
  id: string;
  normalizedScore: number;
};

export type AttemptZResult = {
  id: string;
  zScore: number;
  noteOn20: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function zMeanToNoteOn20(zMean: number): number {
  return Number(clamp(10 + 4 * zMean, 0, 20).toFixed(2));
}

export function computePopulationStats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) {
    return { mean: 0, std: 0 };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (values.length <= 1) {
    return { mean, std: 0 };
  }

  const variance =
    values.reduce((sum, value) => {
      return sum + (value - mean) ** 2;
    }, 0) / values.length;

  return {
    mean,
    std: Math.sqrt(variance),
  };
}

export function computeQuizAttemptZScores(attempts: AttemptScore[]): AttemptZResult[] {
  const { mean, std } = computePopulationStats(attempts.map((attempt) => attempt.normalizedScore));

  return attempts.map((attempt) => {
    const zScore = std === 0 ? 0 : (attempt.normalizedScore - mean) / std;
    return {
      id: attempt.id,
      zScore: Number(zScore.toFixed(6)),
      noteOn20: zMeanToNoteOn20(zScore),
    };
  });
}
