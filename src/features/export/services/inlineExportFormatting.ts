export interface InlineExportContent {
  html: string;
  text: string;
  hasFormulas: boolean;
}

export type InlineWrapperTag = 'em' | 'strong' | 'code';

export const wrapInlineExportContent = (
  tag: InlineWrapperTag,
  content: InlineExportContent,
): InlineExportContent => {
  switch (tag) {
    case 'em':
      return {
        html: `<em>${content.html}</em>`,
        text: `*${content.text}*`,
        hasFormulas: content.hasFormulas,
      };
    case 'strong':
      return {
        html: `<strong>${content.html}</strong>`,
        text: `**${content.text}**`,
        hasFormulas: content.hasFormulas,
      };
    case 'code':
      return {
        html: `<code>${content.html}</code>`,
        text: `\`${content.text}\``,
        hasFormulas: content.hasFormulas,
      };
  }
};
