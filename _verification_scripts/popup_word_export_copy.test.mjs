import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const popupPath = resolve(
  'C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/src/pages/popup/Popup.tsx',
);
const popupSource = readFileSync(popupPath, 'utf8');

const expectedSnippets = [
  'Word 导出排版',
  '调整单条回复导出为 Word 时的文档风格',
  "label: '默认'",
  "label: '学术'",
  'title="纯正文导出"',
  'title="字体大小"',
  'title="行间距"',
  'title="字间距"',
];

expectedSnippets.forEach((snippet) => {
  assert.match(popupSource, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

assert.doesNotMatch(popupSource, /Word \?{4}/);
assert.doesNotMatch(popupSource, /title="\?{3,}"/);
assert.doesNotMatch(popupSource, /description=".*\?{4,}.*"/);

console.log('popup word export copy regression passed');
