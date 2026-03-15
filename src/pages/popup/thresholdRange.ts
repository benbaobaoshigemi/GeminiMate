export interface DualThresholdRangeInput {
  min: number;
  max: number;
  goodValue: number;
  badValue: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const normalizeDualThresholdRange = ({
  min,
  max,
  goodValue,
  badValue,
}: DualThresholdRangeInput): { goodValue: number; badValue: number } => {
  const boundedMin = Math.min(min, max);
  const boundedMax = Math.max(min, max);
  const clampedGoodValue = clamp(goodValue, boundedMin, boundedMax);
  const clampedBadValue = clamp(badValue, boundedMin, boundedMax);

  return {
    goodValue: Math.min(clampedGoodValue, clampedBadValue),
    badValue: Math.max(clampedGoodValue, clampedBadValue),
  };
};

export const resolveDualThresholdPercents = ({
  min,
  max,
  goodValue,
  badValue,
}: DualThresholdRangeInput): { goodPercent: number; badPercent: number } => {
  const boundedMin = Math.min(min, max);
  const boundedMax = Math.max(min, max);
  const span = boundedMax - boundedMin;

  if (span === 0) {
    return {
      goodPercent: 0,
      badPercent: 100,
    };
  }

  const normalized = normalizeDualThresholdRange({
    min: boundedMin,
    max: boundedMax,
    goodValue,
    badValue,
  });

  return {
    goodPercent: ((normalized.goodValue - boundedMin) / span) * 100,
    badPercent: ((normalized.badValue - boundedMin) / span) * 100,
  };
};

export const constrainGoodThresholdValue = ({
  min,
  max,
  nextValue,
  badValue,
}: {
  min: number;
  max: number;
  nextValue: number;
  badValue: number;
}): number => {
  const boundedMin = Math.min(min, max);
  const boundedMax = Math.max(min, max);
  return Math.min(clamp(nextValue, boundedMin, boundedMax), clamp(badValue, boundedMin, boundedMax));
};

export const constrainBadThresholdValue = ({
  min,
  max,
  goodValue,
  nextValue,
}: {
  min: number;
  max: number;
  goodValue: number;
  nextValue: number;
}): number => {
  const boundedMin = Math.min(min, max);
  const boundedMax = Math.max(min, max);
  return Math.max(clamp(nextValue, boundedMin, boundedMax), clamp(goodValue, boundedMin, boundedMax));
};
