import { readFileSync } from 'node:fs';

const filePath = new URL('../src/pages/content/index.tsx', import.meta.url);
const content = readFileSync(filePath, 'utf8');

const requiredSnippets = [
  "import { startExportButton } from './export';",
  'void startExportButton();',
];

const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

if (missing.length > 0) {
  console.error('[VERIFY][chat-export-entry] missing snippets:');
  missing.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

console.log('[VERIFY][chat-export-entry] export entry wiring is present');
