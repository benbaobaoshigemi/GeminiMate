export interface MarkdownInlineToken {
  readonly kind: 'text' | 'bridge' | 'blocked';
  readonly text: string;
}

export interface MarkdownSplitBoldRange {
  readonly startTokenIndex: number;
  readonly startMarkerIndex: number;
  readonly endTokenIndex: number;
  readonly endMarkerIndex: number;
}

export const findSplitMarkdownBoldRanges = (
  tokens: readonly MarkdownInlineToken[],
): MarkdownSplitBoldRange[] => {
  const ranges: MarkdownSplitBoldRange[] = [];
  let openMarker: { tokenIndex: number; markerIndex: number } | null = null;

  tokens.forEach((token, tokenIndex) => {
    if (token.kind !== 'text' || token.text.length < 2) {
      return;
    }

    for (let index = 0; index < token.text.length - 1; index += 1) {
      if (token.text[index] !== '*' || token.text[index + 1] !== '*') {
        continue;
      }

      if (openMarker === null) {
        openMarker = {
          tokenIndex,
          markerIndex: index,
        };
      } else {
        const hasBlockedTokenBetween = tokens
          .slice(openMarker.tokenIndex + 1, tokenIndex)
          .some((candidate) => candidate.kind === 'blocked');

        if (openMarker.tokenIndex !== tokenIndex && !hasBlockedTokenBetween) {
          ranges.push({
            startTokenIndex: openMarker.tokenIndex,
            startMarkerIndex: openMarker.markerIndex,
            endTokenIndex: tokenIndex,
            endMarkerIndex: index,
          });
        }
        openMarker = null;
      }

      index += 1;
    }
  });

  return ranges;
};
