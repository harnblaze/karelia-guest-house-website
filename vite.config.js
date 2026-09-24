import { defineConfig } from 'vite';
import { readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Страницы сайта: каждая папка с index.html (корень — главная).
   Новая страница — просто новая папка, конфиг править не нужно. */
const skip = new Set(['node_modules', 'dist', 'public', 'src', 'scripts', 'archive', 'research']);
function findPages(dir, rel = '') {
  const found = {};
  if (existsSync(join(dir, 'index.html'))) found[rel ? rel.replaceAll('/', '-') : 'main'] = join(dir, 'index.html');
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.') || (!rel && skip.has(d.name))) continue;
    Object.assign(found, findPages(join(dir, d.name), rel ? `${rel}/${d.name}` : d.name));
  }
  return found;
}
const pages = findPages(__dirname);

/* Общие части страниц: <!--#include header--> подставляет src/partials/header.html.
   Внутри частей {{page}} заменяется на имя текущей страницы — по нему
   подсвечивается пункт меню. Правка шапки делается в одном месте. */
function partials() {
  const dir = join(__dirname, 'src', 'partials');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const page = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || '';
        const expand = (src, depth) => src.replace(/<!--#include ([\w-]+)-->/g, (_, name) => {
          if (depth > 5) throw new Error(`Слишком глубокая вложенность частей: ${name}`);
          const file = join(dir, `${name}.html`);
          if (!existsSync(file)) throw new Error(`Нет части src/partials/${name}.html`);
          return expand(readFileSync(file, 'utf8'), depth + 1)
            .replaceAll('{{page}}', page)
            .replace(new RegExp(`data-nav="${page}"`, 'g'), `data-nav="${page}" aria-current="page"`);
        });
        return expand(html, 0);
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(dir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

/* Провенанс растров лежит рядом с ними в *.webp.json и нужен репозиторию,
   но не публике: эти файлы содержат рабочие пометки. Из сборки их убираем. */
function stripProvenanceSidecars() {
  return {
    name: 'strip-provenance-sidecars',
    closeBundle() {
      const d = join('dist', 'photos');
      if (!existsSync(d)) return;
      for (const f of readdirSync(d)) if (f.endsWith('.json')) rmSync(join(d, f));
    },
  };
}

export default defineConfig({
  plugins: [partials(), stripProvenanceSidecars()],
  server: { port: 5188, host: '127.0.0.1' },
  build: {
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: pages,
    },
  },
});
