import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(
  'C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/src/features/layout/chatWidth.ts',
);
const source = readFileSync(sourcePath, 'utf8');

[
  "'.table-block-component > response-element'",
  "'.table-block-component response-element'",
  "'.table-block-component table-block'",
  'display: block !important;',
  'min-width: 0 !important;',
  'document.head.appendChild(style);',
].forEach((snippet) => {
  assert.match(source, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

console.log('table injection selector regression passed');
