import { describe, expect, it } from 'vitest';

import {
  getGifRasterExportOptions,
  getPngRasterExportOptions,
  resolveGraphExportQuality,
} from './graphExportQuality';

describe('graphExportQuality', () => {
  it('falls back to medium quality for invalid values', () => {
    expect(resolveGraphExportQuality(undefined)).toBe(3);
    expect(resolveGraphExportQuality('bad')).toBe(3);
    expect(resolveGraphExportQuality(9)).toBe(3);
  });

  it('returns larger png raster options for higher quality levels', () => {
    expect(getPngRasterExportOptions(1)).toEqual({
      preferredScale: 2,
      minEdge: 1400,
      maxEdge: 2600,
    });

    expect(getPngRasterExportOptions(5)).toEqual({
      preferredScale: 5,
      minEdge: 4200,
      maxEdge: 6144,
    });
  });

  it('keeps medium gif quality at the existing baseline and allows higher output', () => {
    expect(getGifRasterExportOptions(3)).toEqual({
      preferredScale: 3,
      minEdge: 720,
      maxEdge: 720,
    });

    expect(getGifRasterExportOptions(5)).toEqual({
      preferredScale: 4,
      minEdge: 1200,
      maxEdge: 1200,
    });
  });
});
