import { existsSync, readFileSync } from 'node:fs';

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const readJson = (relativePath) => JSON.parse(read(relativePath).replace(/^\uFEFF/, ''));

const packageJson = readJson('package.json');
const lockJson = readJson('package-lock.json');
const rootManifest = readJson('manifest.json');
const sourceManifest = readJson('src/manifest.json');
const distManifest = readJson('dist/manifest.json');
const viteManifest = readJson('dist/.vite/manifest.json');
const sourcePopup = read('src/pages/popup/Popup.tsx');
const distContentStyle = read('dist/contentStyle.css');

const failures = [];

const expectedVersion = '2.0.1';
const expectedBuildMark = 'build-20260313-v2.0.1';

const popupHtmlEntry = viteManifest['src/pages/popup/index.html'];
const popupHtmlAssetPath = popupHtmlEntry?.file;
const popupRuntimeChunkKey = popupHtmlEntry?.imports?.find((entry) => entry.startsWith('_Popup-'));
const exportRuntimeChunkKey = viteManifest['src/pages/content/index.tsx']?.imports?.find((entry) =>
  entry.startsWith('_feature-export-'),
);
const popupRuntimeChunkPath = popupRuntimeChunkKey ? viteManifest[popupRuntimeChunkKey]?.file : undefined;
const exportRuntimeChunkPath = exportRuntimeChunkKey ? viteManifest[exportRuntimeChunkKey]?.file : undefined;

if (packageJson.version !== expectedVersion) {
  failures.push(`package.json version is ${packageJson.version}, expected ${expectedVersion}`);
}

if (lockJson.version !== expectedVersion || lockJson.packages?.['']?.version !== expectedVersion) {
  failures.push('package-lock.json root version did not update to 2.0.1');
}

if (rootManifest.version !== expectedVersion) {
  failures.push(`root manifest.json version is ${rootManifest.version}, expected ${expectedVersion}`);
}

if (sourceManifest.version !== expectedVersion) {
  failures.push(`src/manifest.json version is ${sourceManifest.version}, expected ${expectedVersion}`);
}

if (distManifest.version !== expectedVersion) {
  failures.push(`dist/manifest.json version is ${distManifest.version}, expected ${expectedVersion}`);
}

if (!sourcePopup.includes(expectedBuildMark)) {
  failures.push('Popup source is missing the updated build mark');
}

if (!popupHtmlAssetPath || !existsSync(new URL(`../dist/${popupHtmlAssetPath}`, import.meta.url))) {
  failures.push('dist popup HTML entry is missing from the Vite manifest');
}

if (!popupRuntimeChunkPath) {
  failures.push('dist popup runtime chunk could not be resolved from the Vite manifest');
}

if (!exportRuntimeChunkPath) {
  failures.push('dist export runtime chunk could not be resolved from the Vite manifest');
}

const popupRuntimeChunk = popupRuntimeChunkPath ? read(`dist/${popupRuntimeChunkPath}`) : '';
const exportRuntimeChunk = exportRuntimeChunkPath ? read(`dist/${exportRuntimeChunkPath}`) : '';

if (popupRuntimeChunk && !popupRuntimeChunk.includes(expectedBuildMark)) {
  failures.push('dist popup runtime chunk is missing the updated build mark');
}

if (popupRuntimeChunk && !popupRuntimeChunk.includes('GEMINIMATE_V2.0.1_STABLE')) {
  failures.push('dist popup runtime chunk is missing the updated stable version label');
}

if (exportRuntimeChunk && !exportRuntimeChunk.includes('gv-export-dialog-eyebrow')) {
  failures.push('dist export runtime chunk is missing the rebuilt export dialog eyebrow structure');
}

if (exportRuntimeChunk && !exportRuntimeChunk.includes('gv-export-section-header')) {
  failures.push('dist export runtime chunk is missing popup-style section headers');
}

if (!distContentStyle.includes('.gv-export-dialog-eyebrow')) {
  failures.push('dist contentStyle.css is missing export eyebrow styles');
}

if (!distContentStyle.includes('.gv-export-section-header')) {
  failures.push('dist contentStyle.css is missing export section header styles');
}

if (
  !Array.isArray(distManifest.content_scripts) ||
  distManifest.content_scripts.length === 0 ||
  !distManifest.content_scripts[0].css?.includes('contentStyle.css')
) {
  failures.push('dist manifest content script no longer injects contentStyle.css');
}

if (
  !Array.isArray(distManifest.content_scripts?.[0]?.css) ||
  !distManifest.content_scripts[0].css.some((entry) => /^assets\/index-.*\.css$/.test(entry))
) {
  failures.push('dist manifest content script is missing the hashed content CSS asset');
}

if (failures.length > 0) {
  console.error('[VERIFY][export-ui] failed checks:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[VERIFY][export-ui] dist build chain checks passed');
