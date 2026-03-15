import assert from 'node:assert/strict';

import {
  buildPreviewSearchText,
  matchesPreviewMarkerQuery,
} from '../src/features/timeline/previewSearch.ts';
import {
  computePreviewPanelLeft,
  resolvePreviewPanelGap,
} from '../src/features/timeline/previewLayout.ts';
import { isCanvasImmersiveModeActive } from '../src/features/timeline/canvasMode.ts';
import {
  buildLinearLayoutWidths,
  CHAT_DUAL_COLUMN_BASELINE_PX,
  CHAT_STANDARD_BASELINE_PX,
  DEFAULT_LAYOUT_SCALE,
  EDIT_INPUT_BASELINE_PX,
  normalizeStoredLayoutScale,
  scaleBaselinePx,
  SIDEBAR_COLLAPSED_BASELINE_PX,
  SIDEBAR_EXPANDED_BASELINE_PX,
} from '../src/features/layout/layoutScale.ts';
import { resolveThoughtTranslationEnabled } from '../src/features/thoughtTranslation/settings.ts';
import { isThoughtContainerActive } from '../src/features/thoughtTranslation/domState.ts';
import {
  hasMeaningfulResponseBodyContentState,
  shouldHideThoughtTranslationDuringRefresh,
  shouldDisplayThoughtTranslation,
} from '../src/features/thoughtTranslation/displayState.ts';
import { selectActiveThoughtSourceNodes } from '../src/features/thoughtTranslation/sourceSelection.ts';
import {
  isManagedThoughtContainerState,
  selectThoughtContainersForCleanup,
} from '../src/features/thoughtTranslation/containerOwnership.ts';
import {
  resolveThoughtLayoutInsertionMode,
  resolveThoughtTextEmphasis,
} from '../src/features/thoughtTranslation/presentationState.ts';
import {
  normalizeThoughtSourceTextBlock,
  sanitizeThoughtTranslationArtifacts,
} from '../src/features/thoughtTranslation/translationArtifacts.ts';
import { resolveWatermarkFetchPlan } from '../src/features/watermarkRemover/fetchStrategy.ts';
import { isExactUltraUpsellLabel } from '../src/features/uiCleanup/ultraUpsell.ts';

assert.equal(
  resolveThoughtTranslationEnabled(undefined),
  false,
  'thought translation should stay off when storage is unset',
);
assert.equal(resolveThoughtTranslationEnabled(true), true);
assert.equal(resolveThoughtTranslationEnabled('true'), true);
assert.equal(resolveThoughtTranslationEnabled(false), false);
assert.equal(resolveThoughtTranslationEnabled('false'), false);
assert.equal(resolveThoughtTranslationEnabled(0), false);
assert.equal(resolveThoughtTranslationEnabled(1), true);

assert.equal(
  buildPreviewSearchText('summary', 'reply body', false),
  'summary',
  'preview search text should not include replies by default',
);
assert.equal(
  buildPreviewSearchText('summary', 'reply body', true),
  'summary\nreply body',
  'preview search text should include replies when enabled',
);

const replyMarker = {
  id: 'turn-1',
  summary: 'summary',
  replyText: 'reply body with keyword and more context',
  index: 0,
  starred: false,
};

assert.equal(
  matchesPreviewMarkerQuery(replyMarker, 'keyword', false),
  false,
  'reply text should not match when reply search is disabled',
);
assert.equal(
  matchesPreviewMarkerQuery(replyMarker, 'keyword', true),
  true,
  'reply text should match when reply search is enabled',
);

assert.equal(
  normalizeStoredLayoutScale(undefined, 70, 100),
  DEFAULT_LAYOUT_SCALE,
  'missing layout scale should fall back to 100 percent baseline',
);
assert.equal(
  normalizeStoredLayoutScale(70, 70, 100),
  DEFAULT_LAYOUT_SCALE,
  'legacy chat width default should map to 100 percent baseline',
);
assert.equal(
  normalizeStoredLayoutScale(60, 60, 100),
  DEFAULT_LAYOUT_SCALE,
  'legacy edit width default should map to 100 percent baseline',
);
assert.equal(
  scaleBaselinePx(CHAT_STANDARD_BASELINE_PX, 102),
  775.2,
  'chat width scaling should be linear from the 760px baseline',
);
assert.equal(
  scaleBaselinePx(EDIT_INPUT_BASELINE_PX, 102),
  775.2,
  'edit input width scaling should reuse the same linear baseline chain',
);
assert.deepEqual(
  buildLinearLayoutWidths(100),
  {
    layoutScale: 100,
    chatStandardPx: CHAT_STANDARD_BASELINE_PX,
    chatDualColumnPx: CHAT_DUAL_COLUMN_BASELINE_PX,
    editInputPx: EDIT_INPUT_BASELINE_PX,
    sidebarExpandedPx: SIDEBAR_EXPANDED_BASELINE_PX,
    sidebarCollapsedPx: SIDEBAR_COLLAPSED_BASELINE_PX,
  },
  '100 percent layout scale should equal the native baseline constants',
);
assert.equal(
  resolvePreviewPanelGap({ toggleInset: -52, fallbackGap: 16 }),
  52,
  'panel gap should inherit the collapsed toggle slot instead of hugging the timeline bar',
);

assert.equal(
  computePreviewPanelLeft({
    viewportWidth: 1200,
    occupiedLeft: 930,
    occupiedRight: 990,
    panelWidth: 288,
    gap: 52,
    isRTL: false,
  }),
  590,
  'panel should stay left of the collapsed toggle slot',
);
assert.equal(
  computePreviewPanelLeft({
    viewportWidth: 1200,
    occupiedLeft: 930,
    occupiedRight: 990,
    panelWidth: 288,
    gap: 52,
    isRTL: true,
  }),
  904,
  'RTL panel should stay right of the whole occupied timeline zone',
);

assert.equal(isExactUltraUpsellLabel('Upgrade to Google AI Ultra'), true);
assert.equal(isExactUltraUpsellLabel('Upgrade to  Google AI Ultra'), true);
assert.equal(isExactUltraUpsellLabel('Upgrade to Google AI Ultra learn more'), false);
assert.equal(isExactUltraUpsellLabel('show Upgrade to Google AI Ultra in sidebar'), false);
assert.equal(
  isCanvasImmersiveModeActive({
    querySelector(selector) {
      if (selector.includes('immersive-panel')) {
        return {} ;
      }
      return null;
    },
  }),
  true,
  'canvas immersive shell should suppress the whole timeline UI',
);
assert.equal(
  isCanvasImmersiveModeActive({
    querySelector() {
      return null;
    },
  }),
  false,
  'normal chat view should keep timeline UI available',
);

assert.equal(
  isThoughtContainerActive({
    hasManagedLayout: true,
    hasExpandedClass: false,
    toggleExpanded: null,
    isAriaHidden: false,
    isHiddenAttr: false,
    ancestorHidden: false,
    isDisplayNone: false,
    isVisibilityHidden: false,
    hasGeometry: true,
  }),
  true,
  'existing dual-column thought layout should stay active even if expanded class is replaced',
);
assert.equal(
  isThoughtContainerActive({
    hasManagedLayout: false,
    hasExpandedClass: false,
    toggleExpanded: true,
    isAriaHidden: false,
    isHiddenAttr: false,
    ancestorHidden: false,
    isDisplayNone: false,
    isVisibilityHidden: false,
    hasGeometry: true,
  }),
  true,
  'expanded toggle should be sufficient to create the dual-column thought layout on first render',
);
assert.equal(
  isThoughtContainerActive({
    hasManagedLayout: true,
    hasExpandedClass: false,
    toggleExpanded: false,
    isAriaHidden: false,
    isHiddenAttr: false,
    ancestorHidden: false,
    isDisplayNone: false,
    isVisibilityHidden: false,
    hasGeometry: true,
  }),
  false,
  'collapsed toggle should still tear down the dual-column thought layout',
);
assert.deepEqual(
  selectActiveThoughtSourceNodes([
    { node: 'old-1', isInOriginalSlot: true },
    { node: 'old-2', isInOriginalSlot: true },
    { node: 'fresh-1', isInOriginalSlot: false },
  ]),
  ['fresh-1'],
  'streaming updates should prefer fresh source nodes outside the original slot instead of accumulating old snapshots',
);
assert.deepEqual(
  selectActiveThoughtSourceNodes([
    { node: 'old-1', isInOriginalSlot: true },
    { node: 'old-2', isInOriginalSlot: true },
  ]),
  ['old-1', 'old-2'],
  'without fresh external source nodes the existing original slot snapshot should remain the active source',
);
assert.equal(
  isManagedThoughtContainerState({
    hasManagedLayout: false,
    hasTranslatedAttr: false,
    hasProcessingAttr: false,
    hasSourceAttr: false,
    hasErrorAttr: false,
    hasModeAttr: false,
  }),
  false,
  'plain thought wrappers without GeminiMate markers should never enter cleanup ownership',
);
assert.equal(
  isManagedThoughtContainerState({
    hasManagedLayout: true,
    hasTranslatedAttr: false,
    hasProcessingAttr: false,
    hasSourceAttr: false,
    hasErrorAttr: false,
    hasModeAttr: false,
  }),
  true,
  'a container with the managed dual-column layout is owned by GeminiMate and must be eligible for cleanup',
);
assert.deepEqual(
  selectThoughtContainersForCleanup([
    { container: 'wrapper', isActive: false, isManaged: false },
    { container: 'stale-layout', isActive: false, isManaged: true },
    { container: 'active-layout', isActive: true, isManaged: true },
  ]),
  ['stale-layout'],
  'cleanup must target only stale managed containers instead of every ancestor wrapper in the thought tree',
);
assert.equal(
  shouldDisplayThoughtTranslation({
    hasReadyTranslation: false,
    hasResponseBodyContent: true,
  }),
  false,
  'without a completed translation result the thought tree must not inject any translation DOM',
);
assert.equal(
  shouldDisplayThoughtTranslation({
    hasReadyTranslation: true,
    hasResponseBodyContent: false,
  }),
  false,
  'thought translation should stay hidden until the reply body block contains actual content',
);
assert.equal(
  shouldDisplayThoughtTranslation({
    hasReadyTranslation: true,
    hasResponseBodyContent: true,
  }),
  true,
  'thought translation should appear as soon as the reply body block contains actual content',
);
assert.equal(
  shouldHideThoughtTranslationDuringRefresh({
    hasDisplayedTranslation: true,
    isDisplayReady: true,
  }),
  false,
  'once a completed thought translation is already on screen, background refresh must preserve it instead of tearing the layout down',
);
assert.equal(
  shouldHideThoughtTranslationDuringRefresh({
    hasDisplayedTranslation: false,
    isDisplayReady: true,
  }),
  true,
  'the first unfinished translation refresh should still keep the DOM empty until a completed translation is ready',
);
assert.equal(
  shouldHideThoughtTranslationDuringRefresh({
    hasDisplayedTranslation: true,
    isDisplayReady: false,
  }),
  true,
  'if the reply body is no longer display-ready, the thought translation must still be hidden',
);
assert.equal(
  resolveThoughtLayoutInsertionMode({
    hasExistingLayout: false,
    hasIncomingSourceNodes: true,
  }),
  'before-first-source',
  'the dual-column thought layout should anchor to the first source node instead of being appended to the tail on first display',
);
assert.equal(
  resolveThoughtLayoutInsertionMode({
    hasExistingLayout: true,
    hasIncomingSourceNodes: true,
  }),
  'keep-existing',
  'once the layout already exists, re-sync should preserve the existing anchor instead of moving the layout again',
);
assert.equal(
  resolveThoughtLayoutInsertionMode({
    hasExistingLayout: false,
    hasIncomingSourceNodes: false,
  }),
  'append-tail',
  'without any incoming source nodes there is no anchor to bind against, so tail append remains the only valid fallback',
);
assert.equal(
  resolveThoughtTextEmphasis({
    fullTextLength: 18,
    strongTextLength: 18,
    textOutsideStrongLength: 0,
  }),
  'strong',
  'a fully bold source paragraph should remain bold in the translated thought output',
);
assert.equal(
  resolveThoughtTextEmphasis({
    fullTextLength: 24,
    strongTextLength: 8,
    textOutsideStrongLength: 16,
  }),
  'normal',
  'mixed normal and bold inline content should not be upcast into a fully bold translated paragraph',
);
assert.equal(
  sanitizeThoughtTranslationArtifacts('你好 〈2026-03-15 02:38〉 zh-CNzh-CN'),
  '你好 〈2026-03-15 02:38〉',
  'duplicated target-language tags must be stripped from translated thought output',
);
assert.equal(
  sanitizeThoughtTranslationArtifacts('内容 zh-CN'),
  '内容',
  'a trailing standalone target-language tag must not leak into the rendered translation',
);
assert.equal(
  sanitizeThoughtTranslationArtifacts('\\n\\nenen'),
  '',
  'escaped newline placeholder blocks and their duplicated en markers must be stripped from translated thought output',
);
assert.equal(
  normalizeThoughtSourceTextBlock('\\n\\n'),
  '',
  'source thought blocks that are only escaped newline markers must be dropped before translation',
);
assert.deepEqual(
  resolveWatermarkFetchPlan({
    sourceUrl: 'https://lh3.googleusercontent.com/example=s1024',
    hasProcessedBlobUrl: false,
    hasRenderableImageElement: true,
  }),
  ['background-runtime', 'page-fetch', 'rendered-image'],
  'watermark download must fall back from background fetch to page fetch and finally to the already-rendered image element',
);
assert.deepEqual(
  resolveWatermarkFetchPlan({
    sourceUrl: 'blob:https://gemini.google.com/abc',
    hasProcessedBlobUrl: false,
    hasRenderableImageElement: true,
  }),
  ['rendered-image'],
  'blob-scoped Gemini images cannot go through runtime fetch and must fall back to the rendered image element',
);
assert.equal(
  hasMeaningfulResponseBodyContentState({
    textLength: 0,
    hasImageLikeContent: false,
    hasTableLikeContent: false,
    hasCodeLikeContent: false,
  }),
  false,
  'empty reply-body placeholders must not count as body content',
);
assert.equal(
  hasMeaningfulResponseBodyContentState({
    textLength: 18,
    hasImageLikeContent: false,
    hasTableLikeContent: false,
    hasCodeLikeContent: false,
  }),
  true,
  'actual reply-body text should unlock thought translation display',
);
assert.equal(
  hasMeaningfulResponseBodyContentState({
    textLength: 0,
    hasImageLikeContent: true,
    hasTableLikeContent: false,
    hasCodeLikeContent: false,
  }),
  true,
  'non-text media replies should still count as reply-body content',
);

console.log('sidebar_search_thought_cleanup_regression: ok');
