import { describe, expect, it } from 'vitest';

import { findSplitMarkdownBoldRanges } from './markdownSplitBold';

describe('findSplitMarkdownBoldRanges', () => {
  it('detects a bold range whose markers are split by an inline math token', () => {
    const leadingText = 'XPS 整个分析室通常需要包裹数层昂贵的**坡莫合金（ ';
    const trailingText = ' ）**进行磁屏蔽。';

    expect(
      findSplitMarkdownBoldRanges([
        {
          kind: 'text',
          text: leadingText,
        },
        {
          kind: 'bridge',
          text: '\\mu\\text{-metal}',
        },
        {
          kind: 'text',
          text: trailingText,
        },
      ]),
    ).toEqual([
      {
        startTokenIndex: 0,
        startMarkerIndex: leadingText.indexOf('**'),
        endTokenIndex: 2,
        endMarkerIndex: trailingText.indexOf('**'),
      },
    ]);
  });

  it('ignores bold markers that already open and close inside the same text token', () => {
    expect(
      findSplitMarkdownBoldRanges([
        {
          kind: 'text',
          text: '这是**已经完整闭合**的粗体。',
        },
      ]),
    ).toEqual([]);
  });

  it('refuses to bridge across blocked nodes', () => {
    expect(
      findSplitMarkdownBoldRanges([
        {
          kind: 'text',
          text: '前缀 **粗体 ',
        },
        {
          kind: 'blocked',
          text: 'block-content',
        },
        {
          kind: 'text',
          text: ' 结束** 后缀',
        },
      ]),
    ).toEqual([]);
  });
});
