from pathlib import Path
import subprocess
import zipfile

project = Path(r'C:\Users\zhang\Desktop\GeminiHelper\GeminiMate')
source_path = project / 'src' / 'features' / 'export' / 'services' / 'WordResponseExportService.ts'
sample_docx = Path(r'E:\Downloads\geminimate-response-2026-03-08_07-48-14-299.docx')
source = source_path.read_text(encoding='utf-8')

required_source_snippets = {
    "heading color override": "color: '000000'",
    "academic serif eastAsia": "eastAsia: 'Source Han Serif SC'",
    "academic serif latin": "ascii: 'Times New Roman'",
    "omml normalization": 'normalizeOmmlTree(xmlDoc.documentElement, xmlDoc);',
    "title style override": "style: 'Heading1'",
}
for label, snippet in required_source_snippets.items():
    if snippet not in source:
        raise SystemExit(f'missing source fix: {label}')

with zipfile.ZipFile(sample_docx) as zf:
    document_xml = zf.read('word/document.xml').decode('utf-8', errors='replace')
    styles_xml = zf.read('word/styles.xml').decode('utf-8', errors='replace')

if 'w:color w:val="2E74B5"' not in styles_xml:
    raise SystemExit('expected old blue heading style not found in sample docx')
if '<m:e>(x)dx=F(b)−F(a)</m:e>' not in document_xml:
    raise SystemExit('expected broken integral OMML not found in sample docx')

node_script = r"""
import temml from 'temml';
import { mml2omml } from '@hungknguyen/mathml2omml';
const latex = String.raw`\int_a^b f(x)\,dx = F(b) - F(a)`;
const mathml = temml.renderToString(latex, { displayMode: true, xml: true, annotate: false, throwOnError: true, colorIsTextColor: true, trust: false });
console.log(mml2omml(mathml));
"""
result = subprocess.run(
    ['node', '-e', node_script],
    cwd=str(project),
    capture_output=True,
    text=True,
    encoding='utf-8',
    check=True,
)
raw_omml = result.stdout.strip()
if '<m:e><m:r><m:t xml:space="preserve">f</m:t></m:r>(x)</m:e>' not in raw_omml:
    raise SystemExit('expected raw converter edge case not reproduced')

print('word export regression evidence checks passed')
print('sample docx still shows old blue heading styles and broken integral OMML; source now contains the normalization and black heading overrides.')
