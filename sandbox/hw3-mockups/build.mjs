// Сборка макетов: dist/index.html (полный документ) и dist/artifact.html (для публикации)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.tsx'], bundle: true, minify: true, write: false, jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' }, format: 'iife' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const body = `<div id="root"></div><script>${js}</script>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Семейный бюджет — макеты</title><style>${css}</style></head><body>${body}</body></html>`);
writeFileSync('dist/artifact.html', `<title>Семейный бюджет: прототип</title>\n<style>${css}</style>\n${body}`);
console.log('built', (js.length / 1024).toFixed(0) + ' KB js');
