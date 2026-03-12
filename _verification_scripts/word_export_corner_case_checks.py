from pathlib import Path
import subprocess
import zipfile

project = Path(r'C:\Users\zhang\Desktop\GeminiHelper\GeminiMate')
source_path = project / 'src' / 'features' / 'export' / 'services' / 'WordResponseExportService.ts'
sample_docx = Path(r'E:\Downloads\geminimate-response-2026-03-08_08-17-41-664.docx')
source = source_path.read_text(encoding='utf-8')

expected_new_snippets = {
    'rich table cell pipeline': 'buildTableCellChildren(',
    'operator normalization helper': 'normalizeTrailingMathContent(',
}
for label, snippet in expected_new_snippets.items():
    if snippet not in source:
        raise SystemExit(f'missing source fix: {label}')

bad_legacy_snippet = "new TableCell({ children: [this.createParagraphFromText(cell.innerText || '', context)] })"
if bad_legacy_snippet in source:
    raise SystemExit('legacy table innerText flattening still present')

with zipfile.ZipFile(sample_docx) as zf:
    document_xml = zf.read('word/document.xml').decode('utf-8', errors='replace')

for needle in [
    'F=dpdt=ma',
    'F=keq1q2r2',
    'F=Gm1m2r2',
    'S=kBln',
]:
    if needle not in document_xml:
        raise SystemExit(f'expected flattened table formula evidence missing: {needle}')

tmp_script = project / '_verification_scripts' / 'tmp_sum_edgecase_check.mjs'
tmp_script.write_text(
    """
import temml from 'temml';
import { mml2omml } from '@hungknguyen/mathml2omml';
const sumMath = temml.renderToString(String.raw`\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}`, { displayMode: true, xml: true, annotate: false, throwOnError: true, colorIsTextColor: true, trust: false });
const omml = mml2omml(sumMath);
if (!omml.includes('<m:nary') || !omml.includes('<m:e/>')) {
  throw new Error('expected raw nary edge case not reproduced');
}
console.log('raw nary edge case reproduced');
""".strip(),
    encoding='utf-8',
)
try:
    subprocess.run(
        ['node', str(tmp_script)],
        cwd=str(project),
        capture_output=True,
        text=True,
        encoding='utf-8',
        check=True,
    )
finally:
    if tmp_script.exists():
        tmp_script.unlink()

print('word export corner-case regression checks passed')
