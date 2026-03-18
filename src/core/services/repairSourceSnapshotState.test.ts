import { describe, expect, it } from 'vitest';

import { decideStreamingSourceSnapshotAction } from './repairSourceSnapshotState';

describe('decideStreamingSourceSnapshotAction', () => {
  it('captures the first streaming snapshot', () => {
    expect(decideStreamingSourceSnapshotAction(null, '<p>plain</p>')).toBe('capture');
  });

  it('keeps the existing raw-math snapshot when the candidate only contains normalized native math', () => {
    expect(
      decideStreamingSourceSnapshotAction(
        '<p>为 $ 1486.6 \\\\text{ eV} $，$ E_b $ 是结合能。</p>',
        '<p>为 <span class=\"math-inline\" data-math=\"1486.6 \\\\text{ eV}\"></span>，<span class=\"math-inline\" data-math=\"E_b\"></span> 是结合能。</p>',
      ),
    ).toBe('keep');
  });

  it('replaces a native-math snapshot with a later raw-math snapshot', () => {
    expect(
      decideStreamingSourceSnapshotAction(
        '<p>为 <span class=\"math-inline\" data-math=\"1486.6 \\\\text{ eV}\"></span>。</p>',
        '<p>为 $ 1486.6 \\\\text{ eV} $。</p>',
      ),
    ).toBe('capture');
  });

  it('captures the longer snapshot when both still contain raw formulas', () => {
    expect(
      decideStreamingSourceSnapshotAction(
        '<p>$ h\\\\nu $</p>',
        '<p>$ h\\\\nu $ 是已知能量的单色X射线。</p>',
      ),
    ).toBe('capture');
  });
});
