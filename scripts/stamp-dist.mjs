/** Carimba o formato de cada pasta de saida.
 *  Sem isso, Node le dist/esm como CommonJS (ou o contrario) e o import quebra. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');

const targets = [
  ['cjs', 'commonjs'],
  ['esm', 'module'],
];

for (const [dir, type] of targets) {
  const path = join(root, dir);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`);
}
