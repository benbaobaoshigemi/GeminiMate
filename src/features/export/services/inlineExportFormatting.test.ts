import { describe, expect, it } from 'vitest';

import { wrapInlineExportContent } from './inlineExportFormatting';

describe('wrapInlineExportContent', () => {
  it('preserves nested formula html and markdown text inside strong wrappers', () => {
    const wrapped = wrapInlineExportContent('strong', {
      html: '坡莫合金（ <span class="math-inline" data-math="\\mu\\text{-metal}"><math></math></span> ）',
      text: '坡莫合金（ $\\mu\\text{-metal}$ ）',
      hasFormulas: true,
    });

    expect(wrapped).toEqual({
      html: '<strong>坡莫合金（ <span class="math-inline" data-math="\\mu\\text{-metal}"><math></math></span> ）</strong>',
      text: '**坡莫合金（ $\\mu\\text{-metal}$ ）**',
      hasFormulas: true,
    });
  });

  it('preserves nested formula html inside emphasis wrappers', () => {
    const wrapped = wrapInlineExportContent('em', {
      html: '范围 <span class="math-inline" data-math="x^2"><math></math></span>',
      text: '范围 $x^2$',
      hasFormulas: true,
    });

    expect(wrapped.html).toContain('<em>');
    expect(wrapped.html).toContain('data-math="x^2"');
    expect(wrapped.text).toBe('*范围 $x^2$*');
    expect(wrapped.hasFormulas).toBe(true);
  });
});
