import { describe, expect, it } from 'vitest';

import {
  detectAnimatedSvgMarkup,
  resolveGifCapturePlan,
  resolveRasterExportPlan,
} from './svgExportModel';

describe('svgExportModel', () => {
  it('distinguishes static and animated svg markup', () => {
    const staticSvg = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f0f0f0" />
      </svg>
    `;

    const animatedSvg = `
      <svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes cube-rotate {
            0% { transform: rotateX(-30deg) rotateY(45deg); }
            100% { transform: rotateX(-30deg) rotateY(405deg); }
          }

          .cube-root {
            animation: cube-rotate 10s linear infinite;
          }
        </style>
        <g class="cube-root"></g>
      </svg>
    `;

    expect(detectAnimatedSvgMarkup(staticSvg)).toBe(false);
    expect(detectAnimatedSvgMarkup(animatedSvg)).toBe(true);
  });

  it('raises raster export size for small diagrams', () => {
    expect(resolveRasterExportPlan(200, 200)).toEqual({
      scale: 12,
      targetWidth: 2400,
      targetHeight: 2400,
    });
  });

  it('preserves the existing 3x export baseline for medium diagrams', () => {
    expect(resolveRasterExportPlan(800, 400)).toEqual({
      scale: 3,
      targetWidth: 2400,
      targetHeight: 1200,
    });
  });

  it('clamps raster export size for large diagrams', () => {
    expect(resolveRasterExportPlan(2400, 1200)).toEqual({
      scale: 1.7,
      targetWidth: 4080,
      targetHeight: 2040,
    });
  });

  it('derives a bounded gif capture plan from animation timing', () => {
    const animatedSvg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .outer { animation: spin 10s linear infinite; }
          .inner { animation: twist 4s ease-in-out infinite; }
        </style>
      </svg>
    `;

    expect(resolveGifCapturePlan(animatedSvg)).toEqual({
      durationMs: 4000,
      frameCount: 48,
      frameDelayMs: 83,
      fps: 12,
    });
  });
});
