import { describe, expect, it } from 'vitest';

import {
  normalizeDualThresholdRange,
  resolveDualThresholdPercents,
} from './thresholdRange';

describe('normalizeDualThresholdRange', () => {
  it('clamps values into bounds and keeps good point before bad point', () => {
    expect(
      normalizeDualThresholdRange({
        min: 0,
        max: 100,
        goodValue: 140,
        badValue: -10,
      }),
    ).toEqual({
      goodValue: 0,
      badValue: 100,
    });
  });

  it('keeps equal points when the user collapses the blue zone', () => {
    expect(
      normalizeDualThresholdRange({
        min: 0,
        max: 100,
        goodValue: 30,
        badValue: 30,
      }),
    ).toEqual({
      goodValue: 30,
      badValue: 30,
    });
  });
});

describe('resolveDualThresholdPercents', () => {
  it('maps constrained values into track percentages', () => {
    expect(
      resolveDualThresholdPercents({
        min: 50,
        max: 1000,
        goodValue: 180,
        badValue: 420,
      }),
    ).toEqual({
      goodPercent: 13.684210526315791,
      badPercent: 38.94736842105263,
    });
  });
});
