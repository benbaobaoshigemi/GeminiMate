import { describe, expect, it } from 'vitest';

import {
  buildMarkdownRepairStyle,
  getMarkdownEmphasisStyle,
  getMarkdownRepairMarkerStyle,
} from './repairPresentation';

describe('repairPresentation', () => {
  it('keeps bold emphasis style free of repair marker concerns', () => {
    expect(getMarkdownEmphasisStyle('bold')).toContain('font-weight: bold;');
    expect(getMarkdownEmphasisStyle('bold')).not.toContain('box-shadow');
  });

  it('builds underline emphasis style without losing underline semantics', () => {
    const style = getMarkdownEmphasisStyle('underline');
    expect(style).toContain('text-decoration-line: underline;');
    expect(style).toContain('text-decoration-color: #ffd400;');
  });

  it('adds a separate red repair marker for repaired markdown nodes', () => {
    expect(getMarkdownRepairMarkerStyle()).toContain('rgba(220, 38, 38, 0.75)');
    expect(buildMarkdownRepairStyle('bold')).toContain('box-shadow');
    expect(buildMarkdownRepairStyle('underline')).toContain('box-shadow');
  });
});
