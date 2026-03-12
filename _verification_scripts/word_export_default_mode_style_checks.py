from pathlib import Path

project = Path(r'C:\Users\zhang\Desktop\GeminiHelper\GeminiMate')
manifest = (project / 'manifest.json').read_text(encoding='utf-8')
content_export = (project / 'src' / 'pages' / 'content' / 'export' / 'index.ts').read_text(encoding='utf-8')
word_service = (
    project / 'src' / 'features' / 'export' / 'services' / 'WordResponseExportService.ts'
).read_text(encoding='utf-8')
popup = (project / 'src' / 'pages' / 'popup' / 'Popup.tsx').read_text(encoding='utf-8')
content_page = (project / 'src' / 'pages' / 'content' / 'index.tsx').read_text(encoding='utf-8')
common_types = (project / 'src' / 'core' / 'types' / 'common.ts').read_text(encoding='utf-8')

if '"unlimitedStorage"' not in manifest:
    raise SystemExit('missing unlimitedStorage permission for custom font persistence')

required_common_snippets = {
    'export font size scale key': "WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE",
    'export line height scale key': "WORD_RESPONSE_EXPORT_LINE_HEIGHT_SCALE",
    'export letter spacing scale key': "WORD_RESPONSE_EXPORT_LETTER_SPACING_SCALE",
}

required_content_snippets = {
    'default export font size scale read': 'StorageKeys.WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE',
    'default export line height scale read': 'StorageKeys.WORD_RESPONSE_EXPORT_LINE_HEIGHT_SCALE',
    'default export letter spacing scale read': 'StorageKeys.WORD_RESPONSE_EXPORT_LETTER_SPACING_SCALE',
    'export entry includes dedicated typography keys': 'StorageKeys.WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE,',
    'embedded font trace': "[VIBE_DEBUG_TRACE][WORD_EXPORT_EMBEDDED_FONTS_JSON]",
}

required_popup_snippets = {
    'word export font size slider': 'setWordResponseExportFontSizeScale',
    'word export line height slider': 'setWordResponseExportLineHeightScale',
    'word export letter spacing slider': 'setWordResponseExportLetterSpacingScale',
    'default mode export format copy': '????????????',
    'custom font storage failure trace': "[VIBE_DEBUG_TRACE][CUSTOM_FONT_STORAGE_WRITE_FAILED]",
    'custom font storage success trace': "[VIBE_DEBUG_TRACE][CUSTOM_FONT_STORAGE_WRITE_OK]",
}

required_content_page_snippets = {
    'page trace json log': "[VIBE_DEBUG_TRACE][CUSTOM_FONT_STORAGE_PAGE_TRACE_JSON]",
}

required_service_snippets = {
    'font map trace': "[VIBE_DEBUG_TRACE][WORD_EXPORT_FONT_MAP]",
    'font map json trace': "[VIBE_DEBUG_TRACE][WORD_EXPORT_FONT_MAP_JSON]",
    'body paragraph style id': "private static readonly BODY_PARAGRAPH_STYLE = 'gm-word-body';",
    'body paragraph style registration': 'paragraphStyles: [this.createBodyParagraphStyleOptions(input)]',
    'body paragraph style application': "style: this.BODY_PARAGRAPH_STYLE,",
    'split eastAsia mapping': "eastAsia: preferredEastAsia || primaryFont || 'Microsoft YaHei UI'",
    'default font size uses academic baseline': "Math.round((16 * scale) / 100)",
    'default export ignores base bold': "return false;",
    'empty table fallback uses paragraph helper': "new TableRow({ children: [new TableCell({ children: [this.createParagraphFromText('', context)] })] })",
}

for label, snippet in required_common_snippets.items():
    if snippet not in common_types:
        raise SystemExit(f'missing storage key: {label}')

for label, snippet in required_content_snippets.items():
    if snippet not in content_export:
        raise SystemExit(f'missing content export snippet: {label}')

for label, snippet in required_popup_snippets.items():
    if snippet not in popup:
        raise SystemExit(f'missing popup snippet: {label}')

for label, snippet in required_content_page_snippets.items():
    if snippet not in content_page:
        raise SystemExit(f'missing content page storage trace: {label}')

for label, snippet in required_service_snippets.items():
    if snippet not in word_service:
        raise SystemExit(f'missing word service snippet: {label}')

legacy_bad_patterns = [
    "fontWeight: Number(result[StorageKeys.GEMINI_FONT_WEIGHT]) || 400",
    """const typographyKeys = [
      StorageKeys.GEMINI_FONT_SIZE_SCALE,
      StorageKeys.GEMINI_FONT_WEIGHT,
      StorageKeys.GEMINI_FONT_FAMILY,
      StorageKeys.GEMINI_SANS_PRESET,
      StorageKeys.GEMINI_SERIF_PRESET,
      StorageKeys.GEMINI_CUSTOM_FONTS,
      StorageKeys.GEMINI_LETTER_SPACING,
      StorageKeys.GEMINI_LINE_HEIGHT,
      StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED,
      StorageKeys.GEMINI_EMPHASIS_MODE,
      StorageKeys.WORD_RESPONSE_EXPORT_MODE,
      StorageKeys.WORD_RESPONSE_EXPORT_PURE_BODY,
    ];""",
    "this.resolveBaseRunBold(input)",
    "const lineHeight = input.mode === 'academic' ? 1.85 : Math.max(1.2, 1.75 + input.typography.lineHeight * 0.1);",
    "new TableRow({ children: [new TableCell({ children: [new Paragraph('')] })] })",
]
for pattern in legacy_bad_patterns:
    if pattern in word_service or pattern in content_export:
        raise SystemExit(f'legacy pattern still present: {pattern}')

print('word export default-mode style checks passed')
