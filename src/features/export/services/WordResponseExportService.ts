import temml from 'temml';
import { mml2omml } from '@hungknguyen/mathml2omml';
import { sanitizeMathMlForOmml } from './mathMlSanitizer';
import type { Buffer } from 'buffer';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  ImportedXmlComponent,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type ParagraphChild,
} from 'docx';

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
  includeDocumentChrome: boolean;
  embeddedFonts?: readonly WordEmbeddedFont[];
}

export interface WordResponseExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface WordEmbeddedFont {
  name: string;
  data: Uint8Array;
}

type ExportBlock = Paragraph | Table;

type InlineStyleState = {
  bold: boolean;
  italics: boolean;
  underline: boolean;
  code: boolean;
  preserveWhitespace: boolean;
};

type ListContext = {
  ordered: boolean;
  level: number;
};

type BlockRenderContext = {
  input: WordResponseExportInput;
  quoteDepth: number;
  listContext: ListContext | null;
};

type RunVariant = 'body' | 'title' | 'meta' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type FontFamilyMap = {
  ascii: string;
  hAnsi: string;
  eastAsia: string;
  cs: string;
};

export class WordResponseExportService {
  private static readonly MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
  private static readonly OMML_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  private static readonly XML_NS = 'http://www.w3.org/XML/1998/namespace';
  private static readonly DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  private static readonly BULLET_REFERENCE = 'gm-word-bullet';
  private static readonly NUMBER_REFERENCE = 'gm-word-number';
  private static readonly BODY_PARAGRAPH_STYLE = 'gm-word-body';
  private static readonly FORMULA_SELECTOR =
    '[data-math], .math-inline, .math-block, ms-katex, .katex-display, .katex, math';

  static async exportSingleResponse(input: WordResponseExportInput): Promise<WordResponseExportResult> {
    try {
      const responseHtml = input.assistantHtml?.trim() || this.wrapPlainText(input.assistantText || '');
      const root = this.normalizeResponseRoot(responseHtml);
      const contentBlocks = await this.buildBlocksFromChildren(Array.from(root.childNodes), {
        input,
        quoteDepth: 0,
        listContext: null,
      });
      const effectiveFonts = this.resolveEffectiveFontFamily(input);
      console.error('[VIBE_DEBUG_TRACE][WORD_EXPORT_FONT_MAP]', {
        mode: input.mode,
        configuredFontFamily: input.typography.fontFamily,
        resolvedFontMap: effectiveFonts,
      });
      console.error(
        '[VIBE_DEBUG_TRACE][WORD_EXPORT_FONT_MAP_JSON]',
        JSON.stringify(
          {
            mode: input.mode,
            configuredFontFamily: input.typography.fontFamily,
            resolvedFontMap: effectiveFonts,
            embeddedFontNames: (input.embeddedFonts || []).map((font) => font.name),
          },
          null,
          2,
        ),
      );
      const bodyHalfPoints = this.resolveRunHalfPoints(input, 'body');

      const doc = new Document({
        creator: 'GeminiMate',
        title: input.conversationTitle || 'Gemini Response',
        description: 'GeminiMate single response export',
        fonts: this.resolveEmbeddedFonts(input),
        styles: {
          default: {
            document: {
              run: {
                font: effectiveFonts,
                size: bodyHalfPoints,
                color: '000000',
              },
              paragraph: {
                spacing: this.createParagraphSpacing(input),
              },
            },
            heading1: this.createHeadingStyleOptions(input, 'h1'),
            heading2: this.createHeadingStyleOptions(input, 'h2'),
            heading3: this.createHeadingStyleOptions(input, 'h3'),
            heading4: this.createHeadingStyleOptions(input, 'h4'),
            heading5: this.createHeadingStyleOptions(input, 'h5'),
            heading6: this.createHeadingStyleOptions(input, 'h6'),
          },
          paragraphStyles: [this.createBodyParagraphStyleOptions(input)],
        },
        numbering: {
          config: [
            {
              reference: this.BULLET_REFERENCE,
              levels: this.buildListLevels(false),
            },
            {
              reference: this.NUMBER_REFERENCE,
              levels: this.buildListLevels(true),
            },
          ],
        },
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: [
              ...(input.includeDocumentChrome
                ? [
                    this.createTitleParagraph(input.conversationTitle || 'Gemini Response', input),
                    this.createMetaParagraph(new Date().toLocaleString(), input),
                  ]
                : []),
              ...contentBlocks,
            ],
          },
        ],
      });

      const filename = this.buildFilename();
      const blob = await Packer.toBlob(doc);
      this.triggerDownload(new Blob([blob], { type: this.DOCX_MIME }), filename);

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

  private static normalizeResponseRoot(rawHtml: string): HTMLElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div class="gm-word-root">${rawHtml}</div>`, 'text/html');
    const root = doc.body.querySelector('.gm-word-root');
    if (!root) {
      throw new Error('word_export_root_missing');
    }

    root.querySelectorAll('script, style, noscript').forEach((node) => node.remove());
    this.convertFormulaContainersToMathML(root, doc);

    return root;
  }

  private static convertFormulaContainersToMathML(root: HTMLElement, doc: Document): void {
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(this.FORMULA_SELECTOR));

    for (const candidate of candidates) {
      const parentFormula = candidate.parentElement?.closest(this.FORMULA_SELECTOR);
      if (parentFormula) continue;

      const isMathTag = candidate.localName === 'math';
      const isBlock =
        candidate.classList.contains('math-block') ||
        candidate.classList.contains('katex-display') ||
        candidate.getAttribute('data-math') === 'block' ||
        candidate.querySelector('math[display="block"]') !== null;

      const mathElement = this.resolveMathElementStrict(candidate, doc, isBlock);
      const wrapper = doc.createElement(isBlock ? 'div' : 'span');
      wrapper.setAttribute('data-gm-word-formula', isBlock ? 'block' : 'inline');
      wrapper.appendChild(mathElement);

      if (isMathTag) {
        candidate.replaceWith(wrapper);
      } else {
        candidate.replaceWith(wrapper);
      }
    }
  }

  private static resolveMathElementStrict(candidate: HTMLElement, doc: Document, isBlock: boolean): Element {
    const extracted = this.extractMathElement(candidate, doc);
    if (extracted) {
      if (isBlock) extracted.setAttribute('display', 'block');
      return extracted;
    }

    const latex = this.resolveLatexFromElement(candidate);
    if (!latex) {
      throw new Error('word_formula_source_missing');
    }

    const generated = this.generateMathMLFromLatexStrict(latex, isBlock, doc);
    if (isBlock) {
      generated.setAttribute('display', 'block');
    }
    return generated;
  }

  private static extractMathElement(candidate: HTMLElement, doc: Document): Element | null {
    if (candidate.localName === 'math') {
      return this.importMathElement(candidate, doc);
    }

    const mathNode = candidate.querySelector('math');
    if (!mathNode) return null;
    return this.importMathElement(mathNode, doc);
  }

  private static importMathElement(source: Element, doc: Document): Element {
    const imported = doc.importNode(source, true) as Element;
    if (!imported.getAttribute('xmlns')) {
      imported.setAttribute('xmlns', this.MATHML_NS);
    }
    imported.querySelectorAll('annotation, annotation-xml').forEach((node) => node.remove());
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

  private static generateMathMLFromLatexStrict(latex: string, isBlock: boolean, doc: Document): Element {
    const mathString = temml.renderToString(this.stripMathDelimiters(latex), {
      displayMode: isBlock,
      xml: true,
      annotate: false,
      throwOnError: true,
      colorIsTextColor: true,
      trust: false,
    });

    const xmlDoc = new DOMParser().parseFromString(mathString, 'application/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('word_formula_mathml_parse_failed');
    }

    const mathNode = xmlDoc.documentElement;
    if (mathNode.localName !== 'math') {
      throw new Error('word_formula_mathml_root_invalid');
    }

    return this.importMathElement(mathNode, doc);
  }

  private static async buildBlocksFromChildren(
    nodes: readonly ChildNode[],
    context: BlockRenderContext,
  ): Promise<ExportBlock[]> {
    const blocks: ExportBlock[] = [];

    for (const node of nodes) {
      const converted = await this.convertNodeToBlocks(node, context);
      blocks.push(...converted);
    }

    return blocks.length > 0 ? blocks : [this.createParagraphFromText('', context)];
  }

  private static async convertNodeToBlocks(
    node: ChildNode,
    context: BlockRenderContext,
  ): Promise<ExportBlock[]> {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = this.normalizeInlineText(node.textContent || '', false);
      if (!text) return [];
      return [this.createParagraphFromText(text, context)];
    }

    if (!(node instanceof HTMLElement)) return [];

    if (this.isFormulaWrapper(node)) {
      return [this.createFormulaParagraph(node, context)];
    }

    const tag = node.tagName.toLowerCase();
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return [
          await this.createHeadingParagraph(
            node,
            context,
            tag as Extract<RunVariant, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>,
          ),
        ];
      case 'p':
        return [await this.createRichParagraph(node, context)];
      case 'pre':
        return [this.createCodeParagraph(node, context)];
      case 'blockquote':
        return this.convertBlockquote(node, context);
      case 'ul':
        return this.convertList(node, { ...context, listContext: { ordered: false, level: 0 } });
      case 'ol':
        return this.convertList(node, { ...context, listContext: { ordered: true, level: 0 } });
      case 'table':
        return [await this.createTable(node, context)];
      case 'div':
      case 'section':
      case 'article':
        if (this.hasDirectBlockChildren(node)) {
          return this.buildBlocksFromChildren(Array.from(node.childNodes), context);
        }
        return [await this.createRichParagraph(node, context)];
      case 'img':
        return [];
      case 'hr':
        return [new Paragraph({ text: '' })];
      default:
        if (this.hasDirectBlockChildren(node)) {
          return this.buildBlocksFromChildren(Array.from(node.childNodes), context);
        }
        return [await this.createRichParagraph(node, context)];
    }
  }

  private static hasDirectBlockChildren(element: HTMLElement): boolean {
    return Array.from(element.children).some((child) => this.isBlockTag(child.tagName.toLowerCase()));
  }

  private static isBlockTag(tag: string): boolean {
    return [
      'p',
      'div',
      'section',
      'article',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'table',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ].includes(tag);
  }

  private static async convertBlockquote(
    element: HTMLElement,
    context: BlockRenderContext,
  ): Promise<ExportBlock[]> {
    const nested = await this.buildBlocksFromChildren(Array.from(element.childNodes), {
      ...context,
      quoteDepth: context.quoteDepth + 1,
    });
    return nested;
  }

  private static async convertList(
    listElement: HTMLElement,
    context: BlockRenderContext,
  ): Promise<ExportBlock[]> {
    const items = Array.from(listElement.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName.toLowerCase() === 'li',
    );
    const blocks: ExportBlock[] = [];
    const listContext = context.listContext ?? { ordered: listElement.tagName.toLowerCase() === 'ol', level: 0 };

    for (const item of items) {
      const nestedLists: HTMLElement[] = [];
      const inlineFragment = item.ownerDocument.createElement('div');

      Array.from(item.childNodes).forEach((child) => {
        if (child instanceof HTMLElement && ['ul', 'ol'].includes(child.tagName.toLowerCase())) {
          nestedLists.push(child);
          return;
        }
        inlineFragment.appendChild(child.cloneNode(true));
      });

      const paragraph = await this.createRichParagraph(
        inlineFragment,
        { ...context, listContext },
        {
          numbering: {
            reference: listContext.ordered ? this.NUMBER_REFERENCE : this.BULLET_REFERENCE,
            level: Math.min(listContext.level, 7),
          },
        },
      );
      blocks.push(paragraph);

      for (const nestedList of nestedLists) {
        const ordered = nestedList.tagName.toLowerCase() === 'ol';
        const nestedBlocks = await this.convertList(nestedList, {
          ...context,
          listContext: {
            ordered,
            level: listContext.level + 1,
          },
        });
        blocks.push(...nestedBlocks);
      }
    }

    return blocks;
  }

  private static async createTable(
    tableElement: HTMLElement,
    context: BlockRenderContext,
  ): Promise<Table> {
    const rowElements = Array.from(
      tableElement.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr'),
    );
    const rows: TableRow[] = [];

    for (const row of rowElements) {
      const cells = Array.from(row.children).filter(
        (cell): cell is HTMLElement =>
          cell instanceof HTMLElement && ['td', 'th'].includes(cell.tagName.toLowerCase()),
      );

      const cellChildren: TableCell[] = [];
      for (const cell of cells) {
        const blocks = await this.buildTableCellChildren(cell, context);
        cellChildren.push(
          new TableCell({
            children: blocks,
            shading:
              cell.tagName.toLowerCase() === 'th'
                ? {
                    type: 'clear',
                    color: 'auto',
                    fill: 'F8FAFC',
                  }
                : undefined,
          }),
        );
      }

      rows.push(
        new TableRow({
          children:
            cellChildren.length > 0
              ? cellChildren
              : [new TableCell({ children: [this.createParagraphFromText('', context)] })],
        }),
      );
    }

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: rows.length > 0 ? rows : [new TableRow({ children: [new TableCell({ children: [this.createParagraphFromText('', context)] })] })],
    });
  }

  private static async buildTableCellChildren(
    cell: HTMLElement,
    context: BlockRenderContext,
  ): Promise<ExportBlock[]> {
    const cellContext: BlockRenderContext = {
      ...context,
      listContext: null,
      input: {
        ...context.input,
        typography: {
          ...context.input.typography,
          paragraphIndentEnabled: false,
        },
      },
    };

    if (!this.hasDirectBlockChildren(cell)) {
      return [await this.createRichParagraph(cell, cellContext)];
    }

    return this.buildBlocksFromChildren(Array.from(cell.childNodes), cellContext);
  }

  private static createFormulaParagraph(element: HTMLElement, context: BlockRenderContext): Paragraph {
    const mathElement = element.querySelector('math');
    if (!(mathElement instanceof Element)) {
      throw new Error('word_formula_math_missing');
    }

    return new Paragraph({
      alignment: element.getAttribute('data-gm-word-formula') === 'block' ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: this.createParagraphSpacing(context.input),
      children: [this.createOmmlComponent(mathElement)],
    });
  }

  private static async createRichParagraph(
    element: HTMLElement,
    context: BlockRenderContext,
    overrides?: Partial<ConstructorParameters<typeof Paragraph>[0]>,
    variant: RunVariant = 'body',
  ): Promise<Paragraph> {
    const children = await this.buildInlineChildren(Array.from(element.childNodes), context.input, {
      bold: false,
      italics: false,
      underline: false,
      code: false,
      preserveWhitespace: false,
    }, variant);

    return new Paragraph({
      ...this.createParagraphBaseOptions(context),
      ...(overrides ?? {}),
      children:
        children.length > 0
          ? children
          : [
              this.createTextRun(
                '',
                context.input,
                { bold: false, italics: false, underline: false, code: false },
                variant,
              ),
            ],
    });
  }

  private static async createHeadingParagraph(
    element: HTMLElement,
    context: BlockRenderContext,
    variant: Extract<RunVariant, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>,
  ): Promise<Paragraph> {
    return this.createRichParagraph(
      element,
      context,
      {
        style: this.mapHeadingStyleId(variant),
        spacing: this.createHeadingSpacing(variant),
        indent: undefined,
      },
      variant,
    );
  }

  private static createCodeParagraph(element: HTMLElement, context: BlockRenderContext): Paragraph {
    const text = element.innerText || element.textContent || '';
    const lines = text.replace(/\r/g, '').split('\n');
    const runs: ParagraphChild[] = [];

    lines.forEach((line, index) => {
      runs.push(
        this.createTextRun(line, context.input, {
          bold: false,
          italics: false,
          underline: false,
          code: true,
        }, 'body'),
      );
      if (index < lines.length - 1) {
        runs.push(new TextRun({ break: 1 }));
      }
    });

    return new Paragraph({
      ...this.createParagraphBaseOptions(context),
      shading: {
        type: 'clear',
        color: 'auto',
        fill: 'F8FAFC',
      },
      border: {
        top: { color: 'E2E8F0', style: BorderStyle.SINGLE, size: 4 },
        bottom: { color: 'E2E8F0', style: BorderStyle.SINGLE, size: 4 },
        left: { color: 'E2E8F0', style: BorderStyle.SINGLE, size: 4 },
        right: { color: 'E2E8F0', style: BorderStyle.SINGLE, size: 4 },
      },
      children: runs,
    });
  }

  private static async buildInlineChildren(
    nodes: readonly ChildNode[],
    input: WordResponseExportInput,
    style: InlineStyleState,
    variant: RunVariant,
  ): Promise<ParagraphChild[]> {
    const children: ParagraphChild[] = [];

    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = this.normalizeInlineText(node.textContent || '', style.preserveWhitespace);
        if (!text) continue;
        children.push(this.createTextRun(text, input, { ...style }, variant));
        continue;
      }

      if (!(node instanceof HTMLElement)) continue;

      if (this.isFormulaWrapper(node)) {
        const mathElement = node.querySelector('math');
        if (!(mathElement instanceof Element)) {
          throw new Error('word_formula_math_missing');
        }
        children.push(this.createOmmlComponent(mathElement));
        continue;
      }

      const tag = node.tagName.toLowerCase();
      if (tag === 'br') {
        children.push(new TextRun({ break: 1 }));
        continue;
      }

      if (tag === 'a') {
        const href = (node.getAttribute('href') || '').trim();
        const linkChildren = await this.buildInlineChildren(Array.from(node.childNodes), input, style, variant);
        if (!href || linkChildren.length === 0) continue;
        children.push(
          new ExternalHyperlink({
            link: href,
            children: linkChildren,
          }),
        );
        continue;
      }

      const nextStyle = this.mergeInlineStyle(style, node, input.emphasisMode);
      const nestedChildren = await this.buildInlineChildren(Array.from(node.childNodes), input, nextStyle, variant);
      children.push(...nestedChildren);
    }

    return children;
  }

  private static mergeInlineStyle(
    current: InlineStyleState,
    element: HTMLElement,
    emphasisMode: WordResponseEmphasisMode,
  ): InlineStyleState {
    const tag = element.tagName.toLowerCase();
    const strong = ['strong', 'b'].includes(tag);

    return {
      bold: current.bold || (strong && emphasisMode === 'bold'),
      italics: current.italics || ['em', 'i'].includes(tag),
      underline: current.underline || tag === 'u' || (strong && emphasisMode === 'underline'),
      code: current.code || tag === 'code',
      preserveWhitespace: current.preserveWhitespace || tag === 'code',
    };
  }

  private static createTextRun(
    text: string,
    input: WordResponseExportInput,
    style: Pick<InlineStyleState, 'bold' | 'italics' | 'underline' | 'code'>,
    variant: RunVariant,
  ): TextRun {
    const effectiveFonts = style.code ? this.resolveCodeFontFamily() : this.resolveEffectiveFontFamily(input);
    const size = this.resolveRunHalfPoints(input, variant);
    const effectiveBold =
      style.code
        ? false
        : style.bold || this.isHeadingVariant(variant) || variant === 'title';

    return new TextRun({
      text,
      bold: effectiveBold,
      italics: style.italics,
      underline: style.underline
        ? {
            type: UnderlineType.SINGLE,
          }
        : undefined,
      color: variant === 'meta' ? '475569' : '000000',
      font: effectiveFonts,
      size,
      characterSpacing: style.code ? undefined : this.resolveCharacterSpacingTwips(input, size),
      shading: style.code
        ? {
            type: 'clear',
            color: 'auto',
            fill: 'F1F5F9',
          }
        : undefined,
    });
  }

  private static resolveBaseRunBold(input: WordResponseExportInput): boolean {
    return false;
  }

  private static resolveCharacterSpacingTwips(
    input: WordResponseExportInput,
    runHalfPoints: number,
  ): number | undefined {
    if (input.mode === 'academic') {
      return undefined;
    }

    const spacingScale = Math.max(100, Math.min(200, Math.round(input.typography.letterSpacing || 100)));
    if (spacingScale === 100) {
      return undefined;
    }

    const twips = Math.round((runHalfPoints * (spacingScale - 100)) / 20);
    return twips > 0 ? twips : undefined;
  }

  private static createParagraphFromText(text: string, context: BlockRenderContext): Paragraph {
    return new Paragraph({
      ...this.createParagraphBaseOptions(context),
      children: [
        this.createTextRun(
          text,
          context.input,
          { bold: false, italics: false, underline: false, code: false },
          'body',
        ),
      ],
    });
  }

  private static createParagraphBaseOptions(context: BlockRenderContext): Partial<ConstructorParameters<typeof Paragraph>[0]> {
    return {
      style: this.BODY_PARAGRAPH_STYLE,
      spacing: this.createParagraphSpacing(context.input),
      indent: {
        left: context.quoteDepth > 0 ? 720 * context.quoteDepth : undefined,
        firstLine:
          context.listContext || !context.input.typography.paragraphIndentEnabled
            ? undefined
            : 420,
      },
      border:
        context.quoteDepth > 0
          ? {
              left: {
                color: 'CBD5E1',
                style: BorderStyle.SINGLE,
                size: 6,
              },
            }
          : undefined,
    };
  }

  private static createParagraphSpacing(input: WordResponseExportInput): { after: number; line: number } {
    const bodyFontSizePx = this.resolveBodyFontSizePx(input);
    const bodyHalfPoints = Math.round(bodyFontSizePx * 1.5);
    const lineHeight =
      input.mode === 'academic'
        ? 1.85
        : Math.max(0.8, Math.min(1.6, Math.round(input.typography.lineHeight || 100) / 100));

    return {
      after: 160,
      line: Math.round(bodyHalfPoints * lineHeight * 10),
    };
  }

  private static createTitleParagraph(title: string, input: WordResponseExportInput): Paragraph {
    return new Paragraph({
      style: 'Heading1',
      spacing: {
        after: 120,
        line: 360,
      },
      children: [
        this.createTextRun(
          title,
          input,
          { bold: true, italics: false, underline: false, code: false },
          'title',
        ),
      ],
    });
  }

  private static createMetaParagraph(exportedAt: string, input: WordResponseExportInput): Paragraph {
    return new Paragraph({
      spacing: {
        after: 240,
        line: 240,
      },
      children: [
        this.createTextRun(
          `Exported at ${exportedAt}`,
          input,
          { bold: false, italics: false, underline: false, code: false },
          'meta',
        ),
      ],
    });
  }


  private static createBodyParagraphStyleOptions(input: WordResponseExportInput): {
    id: string;
    name: string;
    basedOn: string;
    quickFormat: boolean;
    run: {
      font: FontFamilyMap;
      size: number;
      color: string;
    };
    paragraph: {
      spacing: { after: number; line: number };
    };
  } {
    return {
      id: this.BODY_PARAGRAPH_STYLE,
      name: 'GeminiMate Body',
      basedOn: 'Normal',
      quickFormat: true,
      run: {
        font: this.resolveEffectiveFontFamily(input),
        size: this.resolveRunHalfPoints(input, 'body'),
        color: '000000',
      },
      paragraph: {
        spacing: this.createParagraphSpacing(input),
      },
    };
  }

  private static resolveEmbeddedFonts(
    input: WordResponseExportInput,
  ): readonly { name: string; data: Buffer }[] | undefined {
    if (!input.embeddedFonts || input.embeddedFonts.length === 0) {
      return undefined;
    }

    return input.embeddedFonts.map((font) => ({
      name: font.name,
      data: font.data as unknown as Buffer,
    }));
  }

  private static createOmmlComponent(mathElement: Element): ParagraphChild {
    const mathMarkup = sanitizeMathMlForOmml(this.ensureMathMlNamespace(mathElement.outerHTML));
    const omml = mml2omml(mathMarkup);
    if (!omml || !omml.includes('<m:oMath')) {
      throw new Error('word_formula_omml_conversion_failed');
    }

    const xmlDoc = new DOMParser().parseFromString(omml, 'application/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0 || !xmlDoc.documentElement) {
      console.error('[VIBE_DEBUG_TRACE][WORD_EXPORT_OMML_PARSE_FAILED]', {
        mathMarkup,
        omml,
      });
      throw new Error('word_formula_omml_parse_failed');
    }

    this.normalizeOmmlTree(xmlDoc.documentElement, xmlDoc);
    return this.convertDomElementToImportedComponent(xmlDoc.documentElement) as unknown as ParagraphChild;
  }

  private static normalizeOmmlTree(element: Element, xmlDoc: XMLDocument): void {
    const childNodes = Array.from(element.childNodes);

    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (element.localName === 't') {
          continue;
        }

        const value = child.textContent ?? '';
        if (!value.trim()) {
          child.parentNode?.removeChild(child);
          continue;
        }

        const run = xmlDoc.createElementNS(this.OMML_NS, 'm:r');
        const text = xmlDoc.createElementNS(this.OMML_NS, 'm:t');
        if (/^\s|\s$/.test(value)) {
          text.setAttributeNS(this.XML_NS, 'xml:space', 'preserve');
        }
        text.textContent = value;
        run.appendChild(text);
        child.parentNode?.replaceChild(run, child);
        continue;
      }

      if (!(child instanceof Element)) {
        continue;
      }

      if (child.localName === 'sty') {
        const styleValue = child.getAttribute('m:val') ?? child.getAttribute('val') ?? '';
        if (!styleValue || styleValue === 'undefined') {
          child.parentNode?.removeChild(child);
          continue;
        }
      }

      this.normalizeOmmlTree(child, xmlDoc);
    }

    this.normalizeTrailingMathContent(element, xmlDoc);
  }

  private static normalizeTrailingMathContent(element: Element, xmlDoc: XMLDocument): void {
    if (element.localName !== 'oMath' && element.localName !== 'oMathPara') {
      return;
    }

    const siblings = Array.from(element.childNodes);
    for (let index = 0; index < siblings.length; index++) {
      const child = siblings[index];
      if (!(child instanceof Element) || child.localName !== 'nary') {
        continue;
      }

      const expression = Array.from(child.childNodes).find(
        (node): node is Element => node instanceof Element && node.localName === 'e',
      );
      if (!expression || this.hasMeaningfulMathContent(expression)) {
        continue;
      }

      const trailingNodes = siblings.slice(index + 1).filter((node) => this.hasMeaningfulNode(node));
      if (trailingNodes.length === 0) {
        continue;
      }

      for (const trailing of trailingNodes) {
        expression.appendChild(trailing);
      }

      this.normalizeOmmlTree(expression, xmlDoc);
      break;
    }
  }

  private static hasMeaningfulMathContent(element: Element): boolean {
    return Array.from(element.childNodes).some((node) => this.hasMeaningfulNode(node));
  }

  private static hasMeaningfulNode(node: ChildNode): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').trim().length > 0;
    }

    return node instanceof Element;
  }

  private static convertDomElementToImportedComponent(element: Element): ImportedXmlComponent {
    const attributes = Array.from(element.attributes).reduce<Record<string, string>>((result, attribute) => {
      result[attribute.name] = attribute.value;
      return result;
    }, {});

    const component = new ImportedXmlComponent(element.tagName, attributes);

    Array.from(element.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const value = child.textContent ?? '';
        if (value.length > 0) {
          component.push(value);
        }
        return;
      }

      if (child instanceof Element) {
        component.push(this.convertDomElementToImportedComponent(child));
      }
    });

    return component;
  }

  private static ensureMathMlNamespace(markup: string): string {
    if (markup.includes('xmlns=')) {
      return markup;
    }
    return markup.replace('<math', `<math xmlns="${this.MATHML_NS}"`);
  }

  private static buildListLevels(ordered: boolean): readonly {
    readonly level: number;
    readonly format: (typeof LevelFormat)[keyof typeof LevelFormat];
    readonly text: string;
    readonly alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
    readonly style: {
      readonly paragraph: {
        readonly indent: {
          readonly left: number;
          readonly hanging: number;
        };
      };
    };
  }[] {
    return Array.from({ length: 8 }, (_, level) => ({
      level,
      format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
      text: ordered ? `%${level + 1}.` : '\u2022',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: 720 + level * 360,
            hanging: ordered ? 360 : 240,
          },
        },
      },
    }));
  }

  private static mapHeadingStyleId(variant: Extract<RunVariant, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>): string {
    return variant.replace('h', 'Heading');
  }

  private static resolveEffectiveFontFamily(input: WordResponseExportInput): FontFamilyMap {
    if (input.mode === 'academic') {
      return {
        ascii: 'Times New Roman',
        hAnsi: 'Times New Roman',
        eastAsia: 'Source Han Serif SC',
        cs: 'Times New Roman',
      };
    }

    return this.resolveConfiguredFontFamily(input);
  }

  private static resolveCodeFontFamily(): FontFamilyMap {
    return {
      ascii: 'Cascadia Mono',
      hAnsi: 'Cascadia Mono',
      eastAsia: 'Microsoft YaHei UI',
      cs: 'Cascadia Mono',
    };
  }

  private static resolveConfiguredFontFamily(input: WordResponseExportInput): FontFamilyMap {
    const configured = (input.typography.fontFamily || '').trim();
    const configuredLower = configured.toLowerCase();
    const candidates = configured
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter((item) => item.length > 0)
      .filter((item) => !['serif', 'sans-serif', 'monospace', 'system-ui'].includes(item.toLowerCase()));

    const preferredEastAsia = candidates.find((item) =>
      /source han|noto|microsoft yahei|pingfang|song|simsun|kaiti|fangsong|harmonyos|misans|alibaba/i.test(item),
    );
    const preferredLatin = candidates.find((item) =>
      /times|georgia|baskerville|constantia|segoe|arial|helvetica|source sans|jetbrains|cascadia|fira/i.test(item),
    );
    const primaryFont = candidates[0];

    if (configuredLower.includes('mono') || configuredLower.includes('code') || configuredLower.includes('jetbrains')) {
      return {
        ascii: preferredLatin || primaryFont || 'Cascadia Mono',
        hAnsi: preferredLatin || primaryFont || 'Cascadia Mono',
        eastAsia: preferredEastAsia || primaryFont || 'Microsoft YaHei UI',
        cs: preferredLatin || primaryFont || 'Cascadia Mono',
      };
    }

    if (
      configuredLower.includes('serif') ||
      configuredLower.includes('song') ||
      configuredLower.includes('kaiti') ||
      configuredLower.includes('fangsong')
    ) {
      return {
        ascii: preferredLatin || primaryFont || 'Times New Roman',
        hAnsi: preferredLatin || primaryFont || 'Times New Roman',
        eastAsia: preferredEastAsia || primaryFont || 'Source Han Serif SC',
        cs: preferredLatin || primaryFont || 'Times New Roman',
      };
    }

    return {
      ascii: preferredLatin || primaryFont || 'Segoe UI',
      hAnsi: preferredLatin || primaryFont || 'Segoe UI',
      eastAsia: preferredEastAsia || primaryFont || 'Microsoft YaHei UI',
      cs: preferredLatin || primaryFont || 'Segoe UI',
    };
  }

  private static resolveBodyFontSizePx(input: WordResponseExportInput): number {
    const scale = Math.max(80, Math.min(130, Math.round(input.typography.fontSizeScale || 100)));
    return input.mode === 'academic' ? 16 : Math.max(12, Math.round((16 * scale) / 100));
  }

  private static resolveRunHalfPoints(input: WordResponseExportInput, variant: RunVariant): number {
    const bodyFontSizePx = this.resolveBodyFontSizePx(input);
    const bodyHalfPoints = Math.round(bodyFontSizePx * 1.5);

    if (input.mode === 'academic') {
      switch (variant) {
        case 'title':
          return 32;
        case 'meta':
          return 18;
        case 'h1':
          return 30;
        case 'h2':
          return 28;
        case 'h3':
          return 26;
        case 'h4':
          return 24;
        case 'h5':
          return 23;
        case 'h6':
          return 22;
        default:
          return bodyHalfPoints;
      }
    }

    switch (variant) {
      case 'title':
        return Math.round(bodyHalfPoints * 1.6);
      case 'meta':
        return Math.max(18, Math.round(bodyHalfPoints * 0.9));
      case 'h1':
        return Math.round(bodyHalfPoints * 1.4);
      case 'h2':
        return Math.round(bodyHalfPoints * 1.28);
      case 'h3':
        return Math.round(bodyHalfPoints * 1.2);
      case 'h4':
        return Math.round(bodyHalfPoints * 1.14);
      case 'h5':
        return Math.round(bodyHalfPoints * 1.08);
      case 'h6':
        return Math.round(bodyHalfPoints * 1.04);
      default:
        return bodyHalfPoints;
    }
  }

  private static isHeadingVariant(variant: RunVariant): boolean {
    return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(variant);
  }

  private static createHeadingStyleOptions(
    input: WordResponseExportInput,
    variant: Extract<RunVariant, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>,
  ): {
    run: {
      bold: boolean;
      color: string;
      size: number;
      font: FontFamilyMap;
    };
    paragraph: {
      spacing: { before: number; after: number; line: number };
    };
  } {
    return {
      run: {
        bold: true,
        color: '000000',
        size: this.resolveRunHalfPoints(input, variant),
        font: this.resolveEffectiveFontFamily(input),
      },
      paragraph: {
        spacing: this.createHeadingSpacing(variant),
      },
    };
  }

  private static createHeadingSpacing(
    variant: Extract<RunVariant, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>,
  ): { before: number; after: number; line: number } {
    switch (variant) {
      case 'h1':
        return { before: 280, after: 180, line: 420 };
      case 'h2':
        return { before: 260, after: 160, line: 400 };
      case 'h3':
        return { before: 220, after: 140, line: 380 };
      default:
        return { before: 200, after: 120, line: 360 };
    }
  }

  private static isFormulaWrapper(element: HTMLElement): boolean {
    return element.hasAttribute('data-gm-word-formula') || element.tagName.toLowerCase() === 'math';
  }

  private static normalizeInlineText(value: string, preserveWhitespace: boolean): string {
    const text = value.replace(/\r/g, '');
    return preserveWhitespace ? text : text.replace(/\s+/g, ' ').trim();
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

  private static buildFilename(): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    return `geminimate-response-${stamp}.docx`;
  }

  private static triggerDownload(blob: Blob, filename: string): void {
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
