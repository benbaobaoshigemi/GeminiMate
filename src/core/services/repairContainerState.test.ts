import { describe, expect, it } from 'vitest';

import { decideRepairContainerAction } from './repairContainerState';

describe('decideRepairContainerAction', () => {
  it('rolls markdown-patched html back to source when markdown repair is disabled', () => {
    expect(
      decideRepairContainerAction({
        currentHtml: '<p><b class="gemini-md-fixed gemini-md-fix-mark">fixed</b></p>',
        sourceHtml: '<p>**fixed**</p>',
        rawSourceHtml: '<p>**fixed**</p>',
        latexEnabled: true,
        markdownEnabled: false,
        forceMarkdownRefresh: true,
        hasLatexPatchMarkers: false,
        hasMarkdownPatchMarkers: true,
      }),
    ).toBe('reset-to-source');
  });

  it('rebuilds markdown from patched html when markdown repair stays enabled', () => {
    expect(
      decideRepairContainerAction({
        currentHtml: '<p><b class="gemini-md-fixed gemini-md-fix-mark">fixed</b></p>',
        sourceHtml: '<p>**fixed**</p>',
        rawSourceHtml: '<p>**fixed**</p>',
        latexEnabled: true,
        markdownEnabled: true,
        forceMarkdownRefresh: true,
        hasLatexPatchMarkers: false,
        hasMarkdownPatchMarkers: true,
      }),
    ).toBe('rebuild-markdown');
  });

  it('rolls latex-patched html back to raw source when latex repair is disabled', () => {
    expect(
      decideRepairContainerAction({
        currentHtml: '<p><span class="math-inline gemini-fix-done" data-math="E_k"></span></p>',
        sourceHtml: '<p>$E_k$</p>',
        rawSourceHtml: '<p>$ E_k $</p>',
        latexEnabled: false,
        markdownEnabled: true,
        forceMarkdownRefresh: false,
        hasLatexPatchMarkers: true,
        hasMarkdownPatchMarkers: false,
      }),
    ).toBe('reset-to-raw-source');
  });

  it('ignores already clean source html', () => {
    expect(
      decideRepairContainerAction({
        currentHtml: '<p>clean</p>',
        sourceHtml: '<p>clean</p>',
        rawSourceHtml: '<p>clean</p>',
        latexEnabled: true,
        markdownEnabled: true,
        forceMarkdownRefresh: false,
        hasLatexPatchMarkers: false,
        hasMarkdownPatchMarkers: false,
      }),
    ).toBe('none');
  });
});
