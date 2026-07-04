// Builds a single self-contained HTML file of the game: JS inlined by
// vite-plugin-singlefile, sprite sheets injected as data URIs. The result
// runs from a double-click (file://) with no server or install.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

execSync('npx vite build', { env: { ...process.env, SINGLE: '1' }, stdio: 'inherit' });

const assets = {};
for (const file of readdirSync('public/assets')) {
  if (!file.endsWith('.png')) continue;
  const b64 = readFileSync(`public/assets/${file}`).toString('base64');
  assets[`assets/${file}`] = `data:image/png;base64,${b64}`;
}

let html = readFileSync('dist/index.html', 'utf8');
html = html.replace(
  '<head>',
  `<head><script>window.__INLINE_ASSETS=${JSON.stringify(assets)};</script>`,
);
writeFileSync('dist/soulforge-knight.html', html);
console.log(
  `wrote dist/soulforge-knight.html (${(html.length / 1024 / 1024).toFixed(1)} MB, ${Object.keys(assets).length} sheets inlined)`,
);
