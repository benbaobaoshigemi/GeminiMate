import temml from 'temml';

export type WordResponseExportMode = 'default' | 'academic';
export type WordResponseEmphasisMode = 'bold' | 'underline';

export interface WordResponseTypography {
  fontFamily: string;
  fontSizeScale: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  paragraphIndentEnabled: boolean;
}

export interface WordResponseExportInput {
  assistantHtml: string;
  assistantText: string;
  conversationTitle: string;
  mode: WordResponseExportMode;
  emphasisMode: WordResponseEmphasisMode;
  typography: WordResponseTypography;
}

export interface WordResponseExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export class WordResponseExportService {
  private static readonly MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

  static exportSingleResponse(input: WordResponseExportInput): WordResponseExportResult {
    try {
      const responseHtml = input.assistantHtml?.trim() || this.wrapPlainText(input.assistantText || '');
      const wordSafeHtml = this.normalizeResponseHtmlForWord(responseHtml);
      const style = this.buildWordStyle(input);
      const title = this.escapeHtml(input.conversationTitle || 'Gemini Response');
      const exportedAt = this.escapeHtml(new Date().toLocaleString());

      const htmlDoc = [
        '<html xmlns:m="http://www.w3.org/1998/Math/MathML">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="ProgId" content="Word.Document">',
        '<meta name="Generator" content="GeminiMate">',
        '<style>',
        style,
        '</style>',
        '</head>',
        '<body>',
        '<!--StartFragment-->',
        `<h1 class="gm-word-title">${title}</h1>`,
        `<p class="gm-word-meta">Exported at ${exportedAt}</p>`,
        `<div class="gm-word-response">${wordSafeHtml}</div>`,
        '<!--EndFragment-->',
        '</body>',
        '</html>',
      ].join('');

      const filename = this.buildFilename();
      this.triggerDownload(htmlDoc, filename);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static normalizeResponseHtmlForWord(rawHtml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div class="gm-word-root">${rawHtml}</div>`, 'text/html');
    const root = doc.body.querySelector('.gm-word-root');
    if (!root) {
      return this.wrapPlainText(rawHtml);
    }

    root.querySelectorAll('script, style, noscript').forEach((node) => node.remove());

    this.convertFormulaContainersToMathML(root, doc);

    root.querySelectorAll('math').forEach((mathNode) => {
      if (!mathNode.getAttribute('xmlns')) {
        mathNode.setAttribute('xmlns', this.MATHML_NS);
      }
      mathNode.querySelectorAll('annotation, annotation-xml').forEach((node) => node.remove());
    });

    root
      .querySelectorAll(
        '.katex-html, .katex-error, .katex .strut, .katex .vlist, .katex .vlist-t, .katex .vlist-r, .katex .vlist-s',
      )
      .forEach((node) => node.remove());

    return root.innerHTML;
  }

  private static convertFormulaContainersToMathML(root: HTMLElement, doc: Document): void {
    const selector = '[data-math], .math-inline, .math-block, ms-katex, .katex-display, .katex';
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(selector));

    for (const candidate of candidates) {
      const parentFormula = candidate.parentElement?.closest(selector);
      if (parentFormula) continue;

      const isBlock =
        candidate.classList.contains('math-block') ||
        candidate.classList.contains('katex-display') ||
        candidate.getAttribute('data-math') === 'block' ||
        candidate.querySelector('math[display="block"]') !== null;

      let mathElement = this.extractMathElementFromCandidate(candidate, doc);

      if (!mathElement) {
        const latex = this.resolveLatexFromElement(candidate);
        if (latex) {
          const generated = this.generateMathMLFromLatex(latex, isBlock, doc);
          if (generated) {
            mathElement = generated;
          }
        }
      }

      if (!mathElement) continue;

      const wrapper = doc.createElement(isBlock ? 'div' : 'span');
      wrapper.className = isBlock ? 'gm-word-formula-block' : 'gm-word-formula-inline';
      if (isBlock) {
        mathElement.setAttribute('display', 'block');
      }
      wrapper.appendChild(mathElement);
      candidate.replaceWith(wrapper);
    }
  }

  private static extractMathElementFromCandidate(
    candidate: HTMLElement,
    doc: Document,
  ): Element | null {
    if (candidate.localName === 'math') {
      const imported = doc.importNode(candidate, true) as Element;
      if (!imported.getAttribute('xmlns')) {
        imported.setAttribute('xmlns', this.MATHML_NS);
      }
      return imported;
    }

    const mathNode = candidate.querySelector('math');
    if (!mathNode) return null;

    const imported = doc.importNode(mathNode, true) as Element;
    if (!imported.getAttribute('xmlns')) {
      imported.setAttribute('xmlns', this.MATHML_NS);
    }
    return imported;
  }

  private static resolveLatexFromElement(element: HTMLElement): string | null {
    const dataMath = element.getAttribute('data-math');
    if (dataMath && dataMath !== 'block') {
      return dataMath;
    }

    const annotation = element.querySelector('annotation[encoding="application/x-tex"], annotation');
    const annotationText = annotation?.textContent?.trim();
    if (annotationText) {
      return annotationText;
    }

    return null;
  }

  private static generateMathMLFromLatex(
    latex: string,
    isBlock: boolean,
    doc: Document,
  ): Element | null {
    try {
      const mathString = temml.renderToString(this.stripMathDelimiters(latex), {
        displayMode: isBlock,
        xml: true,
        annotate: false,
        throwOnError: false,
        colorIsTextColor: true,
        trust: false,
      });

      const xmlDoc = new DOMParser().parseFromString(mathString, 'application/xml');
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) return null;

      const mathNode = xmlDoc.documentElement;
      if (mathNode.localName !== 'math') return null;

      const imported = doc.importNode(mathNode, true) as Element;
      if (!imported.getAttribute('xmlns')) {
        imported.setAttribute('xmlns', this.MATHML_NS);
      }
      imported.querySelectorAll('annotation, annotation-xml').forEach((node) => node.remove());
      return imported;
    } catch {
      return null;
    }
  }

  private static stripMathDelimiters(formula: string): string {
    const trimmed = formula.trim();

    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      return trimmed.slice(2, -2);
    }
    if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
      return trimmed.slice(2, -2);
    }
    if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
      return trimmed.slice(2, -2);
    }
    if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
      return trimmed.slice(1, -1);
    }

    return formula;
  }

  private static buildWordStyle(input: WordResponseExportInput): string {
    const mode = input.mode;
    const typography = input.typography;

    const scale = Math.max(80, Math.min(130, Math.round(typography.fontSizeScale || 100)));
    const defaultFontSizePx = Math.max(12, Math.round((16 * scale) / 100));
    const defaultLineHeight =
      typography.lineHeight > 0 ? (1.75 + typography.lineHeight * 0.1).toFixed(2) : '1.75';
    const defaultLetterSpacing =
      typography.letterSpacing > 0 ? `${(typography.letterSpacing * 0.01).toFixed(2)}em` : 'normal';
    const defaultFontWeight = Math.max(300, Math.min(800, Math.round(typography.fontWeight || 400)));
    const defaultFontFamily =
      (typography.fontFamily || '').trim() ||
      "'Google Sans', Roboto, 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";

    const bodyFontFamily =
      mode === 'academic'
        ? "'Times New Roman', 'Source Han Serif SC', 'Noto Serif SC', serif"
        : defaultFontFamily;
    const bodyFontSize = mode === 'academic' ? '15px' : `${defaultFontSizePx}px`;
    const bodyLineHeight = mode === 'academic' ? '1.85' : defaultLineHeight;
    const bodyLetterSpacing = mode === 'academic' ? 'normal' : defaultLetterSpacing;

    const emphasisCss =
      input.emphasisMode === 'underline'
        ? `strong, b { font-weight: 400 !important; text-decoration: underline 1px dotted; text-underline-offset: 0.12em; }`
        : 'strong, b { font-weight: 700 !important; }';
    const paragraphIndentCss = typography.paragraphIndentEnabled
      ? `.gm-word-response p { text-indent: 2em; }`
      : '';

    return `
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: ${bodyFontFamily};
        font-size: ${bodyFontSize};
        line-height: ${bodyLineHeight};
        letter-spacing: ${bodyLetterSpacing};
      }

      body {
        padding: 28px 36px;
      }

      .gm-word-title {
        margin: 0 0 6px;
        font-size: ${mode === 'academic' ? '24px' : '22px'};
        font-weight: ${mode === 'academic' ? '600' : String(defaultFontWeight)};
      }

      .gm-word-meta {
        margin: 0 0 18px;
        color: #475569;
        font-size: 12px;
      }

      .gm-word-response {
        margin-top: 10px;
      }

      .gm-word-response p,
      .gm-word-response li,
      .gm-word-response blockquote,
      .gm-word-response td,
      .gm-word-response th {
        font-family: inherit;
        line-height: inherit;
      }

      .gm-word-response code,
      .gm-word-response pre {
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Mono', Consolas, monospace;
      }

      .gm-word-response pre {
        white-space: pre-wrap;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        padding: 12px;
        overflow-wrap: anywhere;
      }

      .gm-word-response table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
      }

      .gm-word-response th,
      .gm-word-response td {
        border: 1px solid #cbd5e1;
        padding: 8px 10px;
        vertical-align: top;
      }

      .gm-word-formula-inline,
      .gm-word-formula-block {
        font-family: 'Cambria Math', 'STIX Two Math', 'Latin Modern Math', serif;
      }

      .gm-word-formula-inline math,
      .gm-word-formula-block math,
      .gm-word-response math {
        font-family: 'Cambria Math', 'STIX Two Math', 'Latin Modern Math', serif;
      }

      .gm-word-formula-block {
        margin: 10px 0;
      }

      ${emphasisCss}
      ${paragraphIndentCss}
    `;
  }

  private static buildFilename(): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    return `geminimate-response-${stamp}.doc`;
  }

  private static triggerDownload(html: string, filename: string): void {
    const blob = new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  private static wrapPlainText(text: string): string {
    const escaped = this.escapeHtml(text || '');
    return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
  }

  private static escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
