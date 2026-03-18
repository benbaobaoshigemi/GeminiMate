const RAW_INLINE_MATH_REGEX = /\$((?:\\\$|[^$])+?)\$/g;
const RAW_BLOCK_MATH_REGEX = /\$\$[\s\S]*?\$\$/g;
const NATIVE_MATH_NODE_REGEX = /(?:class="[^"]*\bmath-(?:inline|block)\b[^"]*"|data-math="[^"]*")/g;

const countMatches = (html: string, pattern: RegExp): number => {
  pattern.lastIndex = 0;
  let count = 0;
  while (pattern.exec(html) !== null) {
    count += 1;
  }
  return count;
};

const getSnapshotScore = (html: string): { rawMathCount: number; nativeMathCount: number; length: number } => ({
  rawMathCount: countMatches(html, RAW_INLINE_MATH_REGEX) + countMatches(html, RAW_BLOCK_MATH_REGEX),
  nativeMathCount: countMatches(html, NATIVE_MATH_NODE_REGEX),
  length: html.length,
});

export type StreamingSourceSnapshotAction = 'capture' | 'keep';

export const decideStreamingSourceSnapshotAction = (
  existingHtml: string | null,
  candidateHtml: string,
): StreamingSourceSnapshotAction => {
  if (existingHtml === null) {
    return 'capture';
  }

  const existingScore = getSnapshotScore(existingHtml);
  const candidateScore = getSnapshotScore(candidateHtml);

  if (candidateScore.rawMathCount > existingScore.rawMathCount) {
    return 'capture';
  }

  if (candidateScore.rawMathCount < existingScore.rawMathCount) {
    return 'keep';
  }

  if (candidateScore.rawMathCount > 0) {
    return candidateScore.length >= existingScore.length ? 'capture' : 'keep';
  }

  if (candidateScore.nativeMathCount < existingScore.nativeMathCount) {
    return 'capture';
  }

  if (candidateScore.nativeMathCount > existingScore.nativeMathCount) {
    return 'keep';
  }

  return candidateScore.length >= existingScore.length ? 'capture' : 'keep';
};
