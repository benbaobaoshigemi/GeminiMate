// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { extractSvgMarkupFromPayloadPublic } from './svgMarkupExtraction';

describe('svgMarkupExtraction', () => {
  it('extracts a direct svg document', () => {
    const source = `
      <svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="80" fill="#fff" />
      </svg>
    `;

    const result = extractSvgMarkupFromPayloadPublic(source);

    expect(result.markup).toContain('<svg');
    expect(result.strategy).toBe('svg-document');
  });

  it('extracts svg from iframe srcdoc payload', () => {
    const source = `
      <!doctype html>
      <html>
        <body>
          <iframe srcdoc="&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 10 10&quot;&gt;&lt;circle cx=&quot;5&quot; cy=&quot;5&quot; r=&quot;4&quot; /&gt;&lt;/svg&gt;"></iframe>
        </body>
      </html>
    `;

    const result = extractSvgMarkupFromPayloadPublic(source);

    expect(result.markup).toContain('<circle');
    expect(result.strategy).toContain('srcdoc');
  });

  it('extracts svg from data url payload', () => {
    const dataPayload = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0h20v20H0z"/></svg>',
    );
    const source = `<html><body><img src="data:image/svg+xml,${dataPayload}"></body></html>`;

    const result = extractSvgMarkupFromPayloadPublic(source);

    expect(result.markup).toContain('<path');
    expect(result.strategy).toContain('data-svg-url');
  });

  it('extracts svg from raw html fragment text', () => {
    const source = `
      <html>
        <body>
          <div class="payload">
            before
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><rect width="30" height="30"/></svg>
            after
          </div>
        </body>
      </html>
    `;

    const result = extractSvgMarkupFromPayloadPublic(source);

    expect(result.markup).toContain('<rect');
    expect(result.strategy === 'document-svg' || result.strategy === 'raw-svg-fragment').toBe(true);
  });
});
