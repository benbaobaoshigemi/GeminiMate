import assert from 'node:assert/strict';

import {
  buildPreviewSearchText,
  matchesPreviewMarkerQuery,
} from '../src/features/timeline/previewSearch.ts';
import {
  computePreviewPanelLeft,
  resolvePreviewPanelGap,
} from '../src/features/timeline/previewLayout.ts';
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

console.log('sidebar_search_thought_cleanup_regression: ok');
