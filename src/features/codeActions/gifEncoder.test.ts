import { describe, expect, it } from 'vitest';

import { encodeGifAnimation } from './gifEncoder';

describe('gifEncoder', () => {
  it('produces a valid gif89a byte stream', () => {
    const firstFrame = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
    ]);

    const secondFrame = new Uint8ClampedArray([
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);

    const bytes = encodeGifAnimation({
      width: 2,
      height: 2,
      frames: [
        { rgba: firstFrame, delayMs: 80 },
        { rgba: secondFrame, delayMs: 80 },
      ],
      loopCount: 0,
    });

    expect(Array.from(bytes.slice(0, 6))).toEqual([71, 73, 70, 56, 57, 97]);
    expect(bytes[bytes.length - 1]).toBe(0x3b);
    expect(bytes.length).toBeGreaterThan(80);
  });
});
