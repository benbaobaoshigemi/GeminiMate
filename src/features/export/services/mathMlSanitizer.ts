export const sanitizeMathMlForOmml = (markup: string): string => {
  let sanitized = markup;
  const unsupportedWrapperTags = ['mpadded'];

  sanitized = sanitized.replace(/&nbsp;/g, '&#160;');

  unsupportedWrapperTags.forEach((tagName) => {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'g');
    let next = sanitized.replace(pattern, '$1');
    while (next !== sanitized) {
      sanitized = next;
      next = sanitized.replace(pattern, '$1');
    }
  });

  sanitized = sanitized.replace(/\s+mathvariant="normal"/g, '');

  return sanitized;
};
