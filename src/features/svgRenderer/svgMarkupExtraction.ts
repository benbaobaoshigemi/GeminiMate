const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const MAX_EXTRACTION_DEPTH = 4;

const RAW_SVG_PATTERN = /<svg\b[\s\S]*?<\/svg>/i;
const ESCAPED_SVG_PATTERN = /&lt;svg\b[\s\S]*?&lt;\/svg&gt;/i;
const DATA_SVG_PATTERN =
  /data:image\/svg\+xml(?:;charset=[^;,]+)?(?:;(base64))?,([^"')\s>]+)/i;

export type SvgMarkupExtractionDiagnostic = {
  containsDataSvgUrl: boolean;
  containsEscapedSvgTag: boolean;
  containsRawSvgTag: boolean;
  containsSrcdoc: boolean;
};

export type SvgMarkupExtractionResult = {
  diagnostic: SvgMarkupExtractionDiagnostic;
  markup: string | null;
  strategy: string | null;
};

const createEmptyDiagnostic = (): SvgMarkupExtractionDiagnostic => ({
  containsDataSvgUrl: false,
  containsEscapedSvgTag: false,
  containsRawSvgTag: false,
  containsSrcdoc: false,
});

const mergeDiagnostic = (
  base: SvgMarkupExtractionDiagnostic,
  extra: SvgMarkupExtractionDiagnostic,
): SvgMarkupExtractionDiagnostic => ({
  containsDataSvgUrl: base.containsDataSvgUrl || extra.containsDataSvgUrl,
  containsEscapedSvgTag: base.containsEscapedSvgTag || extra.containsEscapedSvgTag,
  containsRawSvgTag: base.containsRawSvgTag || extra.containsRawSvgTag,
  containsSrcdoc: base.containsSrcdoc || extra.containsSrcdoc,
});

const decodeHtmlEntities = (value: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const ensureSvgNamespaces = (svg: Element): void => {
  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', SVG_NAMESPACE);
  }

  const usesXlinkHref =
    svg.querySelector('[xlink\\:href]') !== null ||
    Array.from(svg.attributes).some((attribute) => attribute.name === 'xlink:href');
  if (usesXlinkHref && !svg.getAttribute('xmlns:xlink')) {
    svg.setAttribute('xmlns:xlink', XLINK_NAMESPACE);
  }
};

const serializeSvgElement = (svg: Element): string => {
  ensureSvgNamespaces(svg);
  return new XMLSerializer().serializeToString(svg);
};

const tryParseSvgDocument = (source: string): string | null => {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return null;
  }

  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') {
    return null;
  }

  return serializeSvgElement(root);
};

const extractSvgFromRawFragment = (source: string): string | null => {
  const match = source.match(RAW_SVG_PATTERN);
  if (!match) {
    return null;
  }

  return tryParseSvgDocument(match[0]);
};

const decodeSvgDataUrl = (value: string): string | null => {
  const match = value.match(DATA_SVG_PATTERN);
  if (!match) {
    return null;
  }

  const isBase64 = typeof match[1] === 'string' && match[1].toLowerCase() === 'base64';
  const payload = match[2] ?? '';
  if (!payload) {
    return null;
  }

  try {
    return isBase64 ? atob(payload) : decodeURIComponent(payload);
  } catch {
    return null;
  }
};

const extractSvgFromElementAttributes = (element: Element, depth: number): SvgMarkupExtractionResult => {
  const attributeNames = ['src', 'data', 'href', 'xlink:href'];
  for (const attributeName of attributeNames) {
    const value = element.getAttribute(attributeName)?.trim() ?? '';
    if (!value.startsWith('data:image/svg+xml')) {
      continue;
    }

    const decoded = decodeSvgDataUrl(value);
    if (!decoded) {
      continue;
    }

    const extracted = extractSvgMarkupFromPayload(decoded, depth + 1);
    if (extracted.markup) {
      return {
        diagnostic: mergeDiagnostic(extracted.diagnostic, {
          containsDataSvgUrl: true,
          containsEscapedSvgTag: false,
          containsRawSvgTag: false,
          containsSrcdoc: false,
        }),
        markup: extracted.markup,
        strategy: extracted.strategy ? `data-svg-url:${extracted.strategy}` : 'data-svg-url',
      };
    }
  }

  return {
    diagnostic: createEmptyDiagnostic(),
    markup: null,
    strategy: null,
  };
};

const extractSvgFromHtmlDocument = (doc: Document, depth: number): SvgMarkupExtractionResult => {
  const svg = doc.querySelector('svg');
  if (svg) {
    return {
      diagnostic: createEmptyDiagnostic(),
      markup: serializeSvgElement(svg),
      strategy: 'document-svg',
    };
  }

  const frames = doc.querySelectorAll('iframe[srcdoc], frame[srcdoc]');
  for (const frame of frames) {
    const srcdoc = frame.getAttribute('srcdoc') ?? '';
    if (!srcdoc.trim()) {
      continue;
    }

    const extracted = extractSvgMarkupFromPayload(decodeHtmlEntities(srcdoc), depth + 1);
    if (extracted.markup) {
      return {
        diagnostic: mergeDiagnostic(extracted.diagnostic, {
          containsDataSvgUrl: false,
          containsEscapedSvgTag: false,
          containsRawSvgTag: false,
          containsSrcdoc: true,
        }),
        markup: extracted.markup,
        strategy: extracted.strategy ? `srcdoc:${extracted.strategy}` : 'srcdoc',
      };
    }
  }

  const attributedElements = doc.querySelectorAll('[src], [data], [href], [xlink\\:href]');
  for (const element of attributedElements) {
    const extracted = extractSvgFromElementAttributes(element, depth);
    if (extracted.markup) {
      return extracted;
    }
  }

  const embeddedTextNodes = doc.querySelectorAll('script, template');
  for (const node of embeddedTextNodes) {
    const embeddedText = node.textContent?.trim() ?? '';
    if (!embeddedText) {
      continue;
    }

    const extracted = extractSvgMarkupFromPayload(embeddedText, depth + 1);
    if (extracted.markup) {
      return {
        diagnostic: extracted.diagnostic,
        markup: extracted.markup,
        strategy: extracted.strategy ? `embedded-text:${extracted.strategy}` : 'embedded-text',
      };
    }
  }

  return {
    diagnostic: {
      containsDataSvgUrl: doc.querySelector('[src^="data:image/svg+xml"], [data^="data:image/svg+xml"], [href^="data:image/svg+xml"]') !== null,
      containsEscapedSvgTag: false,
      containsRawSvgTag: false,
      containsSrcdoc: frames.length > 0,
    },
    markup: null,
    strategy: null,
  };
};

const extractSvgMarkupFromPayload = (payload: string, depth = 0): SvgMarkupExtractionResult => {
  const trimmed = payload.trim();
  const diagnostic: SvgMarkupExtractionDiagnostic = {
    containsDataSvgUrl: DATA_SVG_PATTERN.test(trimmed),
    containsEscapedSvgTag: ESCAPED_SVG_PATTERN.test(trimmed),
    containsRawSvgTag: RAW_SVG_PATTERN.test(trimmed),
    containsSrcdoc: /\bsrcdoc\s*=/i.test(trimmed),
  };

  if (!trimmed || depth > MAX_EXTRACTION_DEPTH) {
    return {
      diagnostic,
      markup: null,
      strategy: null,
    };
  }

  const directSvg = tryParseSvgDocument(trimmed);
  if (directSvg) {
    return {
      diagnostic,
      markup: directSvg,
      strategy: 'svg-document',
    };
  }

  const rawSvg = extractSvgFromRawFragment(trimmed);
  if (rawSvg) {
    return {
      diagnostic,
      markup: rawSvg,
      strategy: 'raw-svg-fragment',
    };
  }

  const htmlDoc = new DOMParser().parseFromString(trimmed, 'text/html');
  const fromHtml = extractSvgFromHtmlDocument(htmlDoc, depth);
  if (fromHtml.markup) {
    return {
      diagnostic: mergeDiagnostic(diagnostic, fromHtml.diagnostic),
      markup: fromHtml.markup,
      strategy: fromHtml.strategy,
    };
  }

  if (diagnostic.containsEscapedSvgTag || trimmed.includes('&lt;')) {
    const decoded = decodeHtmlEntities(trimmed);
    if (decoded !== trimmed) {
      const extracted = extractSvgMarkupFromPayload(decoded, depth + 1);
      if (extracted.markup) {
        return {
          diagnostic: mergeDiagnostic(diagnostic, extracted.diagnostic),
          markup: extracted.markup,
          strategy: extracted.strategy ? `decoded-html:${extracted.strategy}` : 'decoded-html',
        };
      }
    }
  }

  const decodedDataSvg = decodeSvgDataUrl(trimmed);
  if (decodedDataSvg) {
    const extracted = extractSvgMarkupFromPayload(decodedDataSvg, depth + 1);
    if (extracted.markup) {
      return {
        diagnostic: mergeDiagnostic(diagnostic, extracted.diagnostic),
        markup: extracted.markup,
        strategy: extracted.strategy ? `data-payload:${extracted.strategy}` : 'data-payload',
      };
    }
  }

  return {
    diagnostic: mergeDiagnostic(diagnostic, fromHtml.diagnostic),
    markup: null,
    strategy: null,
  };
};

export const extractSvgMarkupFromPayloadPublic = (payload: string): SvgMarkupExtractionResult =>
  extractSvgMarkupFromPayload(payload);
