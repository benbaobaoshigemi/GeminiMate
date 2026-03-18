import { describe, expect, it } from 'vitest';

import {
  collectBlockMathRepairReasons,
  collectInlineMathRepairReasons,
} from './latexRepairHeuristics';

describe('latexRepairHeuristics', () => {
  it('does not flag clean chinese inline math as repaired', () => {
    expect(collectInlineMathRepairReasons('B', 'B', '', '', ' ', ' ')).toEqual([]);
    expect(
      collectInlineMathRepairReasons('0.5\\text{ Gauss}', '0.5\\text{ Gauss}', '', '', ' ', '）'),
    ).toEqual([]);
    expect(
      collectInlineMathRepairReasons('\\mu\\text{-metal}', '\\mu\\text{-metal}', '', '', ' ', '）'),
    ).toEqual([]);
  });

  it('marks inline formulas that required inner padding trim', () => {
    expect(collectInlineMathRepairReasons(' h\\nu ', 'h\\nu', '', '', ' ', ' ')).toEqual([
      'trimmed-inner-padding',
    ]);
    expect(
      collectInlineMathRepairReasons(' 20 \\text{ eV} ', '20 \\text{ eV}', '', '', ' ', '）'),
    ).toEqual(['trimmed-inner-padding']);
  });

  it('marks extracted spillover and ascii boundary repairs', () => {
    expect(collectInlineMathRepairReasons('磁场B', 'B', '磁场', '', ' ', ' ')).toEqual([
      'extracted-prefix',
      'normalized-math-content',
    ]);
    expect(collectInlineMathRepairReasons('E_k', 'E_k', '', '', '量', 'x')).toEqual([
      'boundary-space-after',
    ]);
  });

  it('marks block formulas that required trimming', () => {
    expect(collectBlockMathRepairReasons(' E_k = h\\nu - E_b ', 'E_k = h\\nu - E_b', '', '')).toEqual([
      'trimmed-inner-padding',
    ]);
  });
});
