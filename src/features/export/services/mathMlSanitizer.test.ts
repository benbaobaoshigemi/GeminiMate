import temml from 'temml';
import { mml2omml } from '@hungknguyen/mathml2omml';
import { describe, expect, it } from 'vitest';

import { sanitizeMathMlForOmml } from './mathMlSanitizer';

describe('sanitizeMathMlForOmml', () => {
  it('unwraps unsupported mpadded wrappers before OMML conversion', () => {
    const rawMathMl = temml.renderToString(String.raw`\Delta E`, {
      displayMode: false,
      xml: true,
      annotate: false,
      throwOnError: true,
      colorIsTextColor: true,
      trust: false,
    });

    expect(rawMathMl).toContain('<mpadded');

    const sanitizedMathMl = sanitizeMathMlForOmml(rawMathMl);
    expect(sanitizedMathMl).not.toContain('<mpadded');

    const omml = mml2omml(sanitizedMathMl);
    expect(omml).toContain('ΔE');
    expect(omml).not.toContain('m:val="undefined"');
  });

  it('keeps already compatible MathML unchanged', () => {
    const rawMathMl = temml.renderToString(String.raw`x^2`, {
      displayMode: false,
      xml: true,
      annotate: false,
      throwOnError: true,
      colorIsTextColor: true,
      trust: false,
    });

    expect(sanitizeMathMlForOmml(rawMathMl)).toBe(rawMathMl);
  });

  it('normalizes html nbsp entities into xml-safe whitespace before OMML conversion', () => {
    const rawMathMl =
      '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>0</mn><mo>∼</mo><mn>2000</mn><mtext>&nbsp;keV</mtext></mrow></math>';

    const sanitizedMathMl = sanitizeMathMlForOmml(rawMathMl);
    expect(sanitizedMathMl).not.toContain('&nbsp;');
    expect(sanitizedMathMl).toContain('&#160;keV');

    const omml = mml2omml(sanitizedMathMl);
    expect(omml).not.toContain('&nbsp;');
    expect(omml).toContain('> keV<');
  });
});
