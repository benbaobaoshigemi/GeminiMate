import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const popupPath = resolve(__dirname, '../src/pages/popup/Popup.tsx');

describe('popup word export copy regression', () => {
  it('keeps expected localized copy in popup source', () => {
    const popupSource = readFileSync(popupPath, 'utf8');
    const expectedSnippets = [
      '单条回复 Word 导出',
      '在每条助手回复下显示“导出为 Word”按钮',
      'Word 样式模式',
      "label: '默认模式'",
      "label: '学术模式'",
    ];

    expectedSnippets.forEach((snippet) => {
      expect(popupSource).toMatch(new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });

    expect(popupSource).not.toMatch(/Word \?{4}/);
    expect(popupSource).not.toMatch(/title="\?{3,}"/);
    expect(popupSource).not.toMatch(/description=".*\?{4,}.*"/);
  });
});
