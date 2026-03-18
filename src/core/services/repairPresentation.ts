export type MarkdownEmphasisMode = 'bold' | 'underline';

export const getMarkdownEmphasisStyle = (mode: MarkdownEmphasisMode): string =>
  mode === 'underline'
    ? [
        'font-weight: inherit !important;',
        'text-decoration-line: underline;',
        'text-decoration-style: dashed;',
        'text-decoration-color: #ffd400;',
        'text-decoration-thickness: 2px;',
        'text-underline-offset: 0.18em;',
      ].join(' ')
    : 'font-weight: bold;';

export const getMarkdownRepairMarkerStyle = (): string =>
  'box-shadow: inset 0 -1px 0 rgba(220, 38, 38, 0.75);';

export const buildMarkdownRepairStyle = (mode: MarkdownEmphasisMode): string =>
  `${getMarkdownEmphasisStyle(mode)} ${getMarkdownRepairMarkerStyle()}`.trim();
