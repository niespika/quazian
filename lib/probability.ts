export type Distribution = [number, number, number, number];

function clampToPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded = Math.round(value);
  return Math.min(100, Math.max(0, rounded));
}

export function isSum100(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) === 100;
}

export function normalizeTo100(values: number[]): Distribution {
  const clamped = values.slice(0, 4).map(clampToPercent);
  while (clamped.length < 4) {
    clamped.push(0);
  }

  const total = clamped.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return [25, 25, 25, 25];
  }

  const scaled = clamped.map((value) => (value / total) * 100);
  const floors = scaled.map((value) => Math.floor(value));
  let remaining = 100 - floors.reduce((sum, value) => sum + value, 0);

  const fractions = scaled
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < fractions.length && remaining > 0; i += 1) {
    floors[fractions[i].index] += 1;
    remaining -= 1;
  }

  return floors.slice(0, 4) as Distribution;
}

export function updateDistribution(values: number[], index: number, nextValue: number): Distribution {
  const size = 4;
  const clamped = values.slice(0, size).map(clampToPercent);
  while (clamped.length < size) {
    clamped.push(0);
  }

  const targetIndex = Math.min(size - 1, Math.max(0, index));
  clamped[targetIndex] = clampToPercent(nextValue);

  const lastIndex = size - 1;
  if (targetIndex !== lastIndex) {
    const sumExceptLast = clamped.reduce((sum, value, currentIndex) => {
      return currentIndex === lastIndex ? sum : sum + value;
    }, 0);

    const autoAdjustedLast = 100 - sumExceptLast;
    if (autoAdjustedLast >= 0) {
      clamped[lastIndex] = autoAdjustedLast;
      return clamped as Distribution;
    }
  }

  return normalizeTo100(clamped);
}
