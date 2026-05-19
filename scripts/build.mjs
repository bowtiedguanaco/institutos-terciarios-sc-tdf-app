import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const required = ['public/index.html', 'public/app.js', 'public/styles.css', 'public/data.json', 'src/filter.mjs'];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`Missing required asset: ${path}`);
}
await copyFile('src/filter.mjs', 'public/filter.mjs');
const data = JSON.parse(await readFile('public/data.json', 'utf8'));
const summary = {
  generatedAt: new Date().toISOString(),
  ofertaRows: data.oferta?.length || 0,
  institucionesRows: data.instituciones?.length || 0,
  documentosRows: data.documentos?.length || 0,
};
await writeFile('public/build-info.json', JSON.stringify(summary, null, 2));
console.log('build-info', summary);
