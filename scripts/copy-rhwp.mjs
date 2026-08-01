import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@rhwp', 'core', 'rhwp_bg.wasm');
const destDir = join(root, 'public');
const dest = join(destDir, 'rhwp_bg.wasm');

if (!existsSync(src)) {
  console.error('[copy-rhwp] @rhwp/core WASM not found. Run `npm install` first.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log('[copy-rhwp] copied rhwp_bg.wasm -> public/rhwp_bg.wasm');
