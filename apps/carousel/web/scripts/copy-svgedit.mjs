import { cpSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../node_modules/svgedit/dist/editor');
const dest = join(__dirname, '../public/svgedit');

if (!existsSync(src)) {
  console.error('svgedit not found in node_modules — run npm install first');
  process.exit(1);
}

cpSync(src, dest, { recursive: true });

// Expose svgEditor on window so the parent frame can access it after init
const indexPath = join(dest, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const patched = html.replace(
  'svgEditor.init()',
  'svgEditor.init().then(() => { window.svgEditor = svgEditor })'
);
writeFileSync(indexPath, patched, 'utf8');

console.log('svgedit copied and patched in public/svgedit/');
