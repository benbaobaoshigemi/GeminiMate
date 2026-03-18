import { describe, expect, it } from 'vitest';

import {
  hasMeaningfulInlineMathContentRepair,
  shouldRepairInlineMathBoundary,
} from './latexRepairHeuristics';

describe('latexRepairHeuristics', () => {
  it('does not treat cjk punctuation adjacency as a repair trigger', () => {
    expect(shouldRepairInlineMathBoundary('（')).toBe(false);
    expect(shouldRepairInlineMathBoundary('）')).toBe(false);
    expect(shouldRepairInlineMathBoundary('。')).toBe(false);
    expect(shouldRepairInlineMathBoundary('，')).toBe(false);
  });

  it('treats ascii word adjacency as a repair trigger', () => {
    expect(shouldRepairInlineMathBoundary('a')).toBe(true);
    expect(shouldRepairInlineMathBoundary('Z')).toBe(true);
    expect(shouldRepairInlineMathBoundary('7')).toBe(true);
    expect(shouldRepairInlineMathBoundary('_')).toBe(true);
  });

  it('does not mark harmless inline padding as a repair', () => {
    expect(hasMeaningfulInlineMathContentRepair(' B ', 'B', '', '')).toBe(false);
    expect(hasMeaningfulInlineMathContentRepair(' \\mu\\text{-metal} ', '\\mu\\text{-metal}', '', '')).toBe(false);
  });

  it('still marks extracted cjk spillover as a repair', () => {
    expect(hasMeaningfulInlineMathContentRepair('磁场B', 'B', '磁场', '')).toBe(true);
    expect(hasMeaningfulInlineMathContentRepair('B强度', 'B', '', '强度')).toBe(true);
  });
});
