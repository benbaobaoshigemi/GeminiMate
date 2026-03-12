import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

const path = 'E:/Downloads/geminimate-response-2026-03-08_07-14-13-501.docx';
const buffer = await readFile(path);
const zip = await JSZip.loadAsync(buffer);
const names = Object.keys(zip.files).sort();
console.log('FILES');
for (const name of names) console.log(name);
console.log('---DOCUMENT---');
console.log(await zip.file('word/document.xml').async('string'));
console.log('---RELS---');
console.log(await zip.file('_rels/.rels').async('string'));
console.log('---CONTENT_TYPES---');
console.log(await zip.file('[Content_Types].xml').async('string'));
