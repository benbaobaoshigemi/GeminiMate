from pathlib import Path
from textwrap import indent

project = Path(r'C:\Users\zhang\Desktop\GeminiHelper\GeminiMate')
files = {
    'popup': project / 'src' / 'pages' / 'popup' / 'Popup.tsx',
    'layout': project / 'src' / 'features' / 'layout' / 'fontSize.ts',
    'export': project / 'src' / 'pages' / 'content' / 'export' / 'index.ts',
    'service': project / 'src' / 'features' / 'export' / 'services' / 'WordResponseExportService.ts',
}
texts = {name: path.read_text(encoding='utf-8') for name, path in files.items()}
lines = {name: text.splitlines() for name, text in texts.items()}


def first_line(name: str, needle: str) -> int | None:
    for idx, line in enumerate(lines[name], start=1):
        if needle in line:
            return idx
    return None


def block(name: str, start_needle: str, max_lines: int = 14) -> str:
    start = first_line(name, start_needle)
    if start is None:
        return f'[missing] {start_needle}'
    snippet = lines[name][start - 1:start - 1 + max_lines]
    return '\n'.join(f'{start + offset}:{text}' for offset, text in enumerate(snippet))


def print_step(title: str, file_key: str, needle: str, max_lines: int = 12) -> None:
    print(f'[{title}] {files[file_key]}')
    print(indent(block(file_key, needle, max_lines), '  '))
    print()


print('=== Chain A: Frontend Effective Typography ===')
print_step('A1 popup reads persisted font settings', 'popup', 'const rawFontFamily = result[StorageKeys.GEMINI_FONT_FAMILY];', 12)
print_step('A2 popup writes sans preset', 'popup', 'const updateSansPreset = (value: string): void => {', 6)
print_step('A3 popup writes serif preset', 'popup', 'const updateSerifPreset = (value: string): void => {', 6)
print_step('A4 popup writes active font family', 'popup', "chrome.storage.local.set({ [StorageKeys.GEMINI_FONT_FAMILY]: opt.value });", 8)
print_step('A5 layout listener reacts to font-family changes', 'layout', 'if (changes[StorageKeys.GEMINI_FONT_FAMILY]) {', 12)
print_step('A6 layout listener reacts to sans preset changes', 'layout', 'if (changes[StorageKeys.GEMINI_SANS_PRESET]) {', 8)
print_step('A7 layout builds CSS from active family + presets', 'layout', 'const css = buildCSS(', 10)
print_step('A8 layout bootstraps from chrome.storage.local', 'layout', 'chrome.storage.local.get(', 16)

print('=== Chain B: Word Export Typography ===')
print_step('B1 export reads typography keys from storage', 'export', 'const typographyKeys = [', 18)
print_step('B2 export resolves font family from storage', 'export', 'function resolveWordFontFamilyFromStorage(result: Record<string, unknown>): string {', 18)
print_step('B3 export resolves Word typography from storage only', 'export', 'function resolveWordTypographyFromStorage(', 16)
print_step('B4 export prints raw + filtered settings trace', 'export', 'function traceWordExportSettings(', 30)
print_step('B5 export applies typography before docx export', 'export', 'const typography = resolveWordTypographyFromStorage(styleSettings, effectiveWordMode);', 14)
print_step('B6 service resolves effective font family map', 'service', 'private static resolveEffectiveFontFamily(input: WordResponseExportInput): FontFamilyMap {', 14)
print_step('B7 service maps configured CSS stack into docx fonts', 'service', 'private static resolveConfiguredFontFamily(input: WordResponseExportInput): FontFamilyMap {', 26)
print_step('B8 service writes font map trace before packing docx', 'service', "console.error('[VIBE_DEBUG_TRACE][WORD_EXPORT_FONT_MAP]", 16)
print_step('B9 service writes TextRun font into the docx document', 'service', 'return new TextRun({', 18)

print('=== Divergence Checks ===')
computed_decl = first_line('export', 'function resolveComputedWordFontFamily(element: HTMLElement | undefined): string | null {')
computed_call = first_line('export', 'const liveFontFamily = resolveComputedWordFontFamily(')
print(f'Computed font helper declared: {computed_decl}')
print(f'Computed font helper call site: {computed_call}')
print('Meaning: helper exists for diagnostics, but the active export path is currently storage-only if call site is None.')
