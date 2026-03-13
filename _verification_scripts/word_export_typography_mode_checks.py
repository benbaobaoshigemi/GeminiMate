from pathlib import Path

project = Path(r'C:\Users\zhang\Desktop\GeminiHelper\GeminiMate')
source_service = (project / 'src' / 'features' / 'export' / 'services' / 'WordResponseExportService.ts').read_text(encoding='utf-8')
source_export = (project / 'src' / 'pages' / 'content' / 'export' / 'index.ts').read_text(encoding='utf-8')
source_popup = (project / 'src' / 'pages' / 'popup' / 'Popup.tsx').read_text(encoding='utf-8')
source_common = (project / 'src' / 'core' / 'types' / 'common.ts').read_text(encoding='utf-8')

required = {
    'storage key pure body': 'WORD_RESPONSE_EXPORT_PURE_BODY',
    'service include chrome switch': 'includeDocumentChrome: boolean',
    'service embedded fonts': 'embeddedFonts?: readonly WordEmbeddedFont[]',
    'content computed font resolver': 'resolveComputedWordFontFamily(',
    'content embedded font resolver': 'resolveWordEmbeddedFonts(',
    'popup pure body toggle text': '纯正文模式',
}
combined = '\n'.join([source_service, source_export, source_popup, source_common])
for label, snippet in required.items():
    if snippet not in combined:
        raise SystemExit(f'missing source fix: {label}')

legacy = "this.createMetaParagraph(new Date().toLocaleString(), input),"
if legacy in source_service and '...(input.includeDocumentChrome' not in source_service:
    raise SystemExit('document chrome is still hard-coded into export service')

print('word export typography/source-mode regression checks passed')
