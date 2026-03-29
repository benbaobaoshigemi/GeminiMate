import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sourcePath = resolve(__dirname, '../src/features/layout/chatWidth.ts');

describe('table injection selector regression', () => {
  it('keeps selector and css injection safeguards', () => {
    const source = readFileSync(sourcePath, 'utf8');

    [
      "'.table-block-component > response-element'",
      "'.table-block-component response-element'",
      "'.table-block-component table-block'",
      'display: block !important;',
      'min-width: 0 !important;',
      'document.head.appendChild(style);',
    ].forEach((snippet) => {
      expect(source).toMatch(new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  });
});
