export const normalizeThoughtSourceTextBlock = (value: string): string =>
  value
    .replace(/(?:\\n|\n)+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

export const sanitizeThoughtTranslationArtifacts = (value: string): string =>
  value
    .replace(/^(?:\\n|\n|\s)+$/g, '')
    .replace(/(?:\\n\s*)+(?:en){2,}(?=\s|$)/gi, '')
    .replace(
      /([\u4e00-\u9fff\u3002\uff0c\uff1b\uff1a\uff01\uff1f\uff09\u3011])(?:\s*(?:en){2,})(?=\s|$)/gi,
      '$1',
    )
    .replace(/(^|\s)(?:en){2,}(?=\s|$)/gi, '$1')
    .replace(/(?:zh[-_ ]?cn\s*){2,}/gi, '')
    .replace(/(^|[\s>〉])zh[-_ ]?cn(?=\s|$)/gi, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
