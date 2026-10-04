import { defineConfig } from 'vite';
import { readdirSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Страницы сайта: каждая папка с index.html (корень — главная).
   Новая страница — просто новая папка, конфиг править не нужно. */
const skip = new Set(['node_modules', 'dist', 'dist-local', 'public', 'src', 'scripts', 'archive', 'research', 'videos']);
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
// Страница 404 лежит в корне файлом 404.html: так её находят и Apache/nginx, и GitHub Pages.
if (existsSync(join(__dirname, '404.html'))) pages.notfound = join(__dirname, '404.html');

/* Боевой адрес сайта: от него строятся canonical, Open Graph, sitemap и robots.txt.
   Сборка для превью на GitHub Pages тоже указывает сюда — дубли не индексируются. */
const SITE = 'https://restkarelia.ru';

/* Подписи связи на страницах объектов называют объект, а WhatsApp получает
   готовый текст с его названием. На остальных страницах — общие подписи. */
const WA = 'https://wa.me/79992901815';
const objects = {
  'bolshoy-dom': { name: 'Большой дом', inName: 'в Большом доме', kids: 'Можно с&nbsp;детьми' },
  'domik-na-troih': { name: 'Домик на троих', inName: 'в Домике на троих', kids: 'Можно с&nbsp;детьми' },
  geokupol: { name: 'геокупол', inName: 'в геокуполе', kids: 'Только для двух взрослых, без детей',
    kitchen: 'Холодильник, чайник, плитка и&nbsp;микроволновка' },
  // Баню заказывают по времени, а не по датам проживания — у неё свои тексты.
  banya: { name: 'баню', waText: 'Здравствуйте! Хочу заказать баню.',
    ctaLead: 'Подскажем свободное время и&nbsp;подготовим баню к&nbsp;вашему приезду.', ctaStep2: 'Укажите дату, время и число гостей' },
};
const waLink = (text) => `${WA}?text=${encodeURIComponent(text)}`;
/* Нижняя панель на телефоне: обычно — переписка о датах; на «Как добраться» — маршрут до поляны. */
const VK = 'https://vk.me/xiuskuyanjoki';
const ICON_DATES = '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>';
const ICON_ROUTE = '<path d="M12 2.8c3.6 0 6.3 2.8 6.3 6.3 0 4.7-6.3 12.1-6.3 12.1S5.7 13.8 5.7 9.1c0-3.5 2.7-6.3 6.3-6.3Z"/><circle cx="12" cy="9.1" r="2.4"/>';
const dock = { dockHref: VK, dockIcon: ICON_DATES };
function pageVars(page) {
  const o = objects[page];
  const cta = o
    ? { ctaLead: o.ctaLead || `Подскажем свободные даты ${o.inName} и&nbsp;расскажем, как добраться.`, ctaStep2: o.ctaStep2 || 'Укажите даты и число гостей' }
    : page === 'kvartiry'
      ? { ctaLead: 'Подскажем свободные даты, поможем выбрать квартиру и расскажем, как добраться.', ctaStep2: 'Укажите квартиру, даты и число гостей' }
      : page === 'kak-dobratsya'
      ? { ctaLead: 'Подскажем дорогу и&nbsp;ответим на&nbsp;вопросы о&nbsp;поездке.', ctaStep2: 'Укажите дом, даты и число гостей' }
      : { ctaLead: 'Подскажем свободные даты, поможем выбрать дом и расскажем, как добраться.', ctaStep2: 'Укажите дом, даты и число гостей' };
  const stay = {
    stayTitle: o ? 'Условия проживания' : 'Условия в домах на поляне',
    stayKids: o?.kids || 'С&nbsp;детьми&nbsp;— в&nbsp;домах; геокупол для двоих взрослых',
    stayKitchen: o?.kitchen || 'Кухня с&nbsp;холодильником, плитой и&nbsp;микроволновкой',
  };
  if (!o) {
    // У квартир у каждой своя кнопка в блоке квартиры; общий WhatsApp хотя бы говорит, что речь о квартире.
    const waHref = page === 'kvartiry' ? waLink('Здравствуйте! Хочу узнать свободные даты в квартире в Питкяранте.') : WA;
    // Кто открыл «Как добраться», часто уже в пути: панель ведёт к маршруту, а не к переписке о датах.
    if (page === 'kak-dobratsya') {
      return { vkLabel: 'Написать ВКонтакте', dockLabel: 'Маршрут до поляны', dockHref: 'https://yandex.ru/maps/?rtext=~61.684959%2C31.318357&amp;rtt=auto',
        dockIcon: ICON_ROUTE, waHref, ...stay, ...cta };
    }
    return { vkLabel: 'Написать ВКонтакте', dockLabel: 'Узнать свободные даты', waHref, ...dock, ...stay, ...cta };
  }
  const ask = `Спросить про ${o.name}`;
  const text = o.waText || `Здравствуйте! Хочу узнать свободные даты ${o.inName}.`;
  return { vkLabel: `${ask}<span class="sr-only"> во ВКонтакте</span>`, dockLabel: ask, waHref: waLink(text), ...dock, ...stay, ...cta };
}

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
          const vars = pageVars(page);
          return expand(readFileSync(file, 'utf8'), depth + 1)
            .replaceAll('{{page}}', page)
            .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))
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
  let outDir = 'dist';
  return {
    name: 'strip-provenance-sidecars',
    configResolved(c) { outDir = c.build.outDir.startsWith('/') ? c.build.outDir : join(c.root, c.build.outDir); },
    closeBundle() {
      const d = join(outDir, 'photos');
      if (!existsSync(d)) return;
      for (const f of readdirSync(d)) if (f.endsWith('.json')) rmSync(join(d, f));
    },
  };
}

/* SEO для каждой страницы: canonical, Open Graph, Twitter и структурированные данные.
   Заголовок и описание берутся из <title> и meta description самой страницы,
   картинка превью — public/og/<страница>.jpg (1200×630). */
const BUSINESS = {
  '@context': 'https://schema.org',
  '@type': 'LodgingBusiness',
  name: 'Гостевые дома «Сюскюянйоки»',
  url: `${SITE}/`,
  image: `${SITE}/og/home.jpg`,
  telephone: '+7 999 290-18-15',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'деревня Кителя, Питкярантский район',
    addressRegion: 'Республика Карелия',
    addressCountry: 'RU',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 61.684959, longitude: 31.318357 },
  checkinTime: '14:00',
  checkoutTime: '12:00',
  petsAllowed: false,
  sameAs: ['https://vk.ru/xiuskuyanjoki'],
};
const ldScript = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const routeOf = (file) => {
  const rel = relative(__dirname, file).replaceAll('\\', '/');
  return rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
};
function seo() {
  return {
    name: 'seo-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || '';
        if (page === '404') return html;
        const route = routeOf(ctx.filename);
        const url = `${SITE}${route}`;
        const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
        const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
        const img = `${SITE}/og/${page}.jpg`;
        const tags = [
          `<link rel="canonical" href="${url}">`,
          '<meta property="og:type" content="website">',
          '<meta property="og:locale" content="ru_RU">',
          '<meta property="og:site_name" content="Гостевые дома «Сюскюянйоки»">',
          `<meta property="og:title" content="${title}">`,
          `<meta property="og:description" content="${desc}">`,
          `<meta property="og:url" content="${url}">`,
          `<meta property="og:image" content="${img}">`,
          '<meta property="og:image:width" content="1200">',
          '<meta property="og:image:height" content="630">',
          '<meta name="twitter:card" content="summary_large_image">',
        ];
        // Превью в подпапке (GitHub Pages) не индексируем — это копия боевого сайта.
        if (base !== '/') tags.unshift('<meta name="robots" content="noindex">');
        if (page === 'home') tags.push(ldScript(BUSINESS));
        // Хлебные крошки со страницы — в разметку BreadcrumbList (якорные пункты вроде «/#doma» пропускаем).
        const crumbs = (html.match(/<ol class="crumbs">([\s\S]*?)<\/ol>/) || [])[1];
        if (crumbs) {
          const items = [...crumbs.matchAll(/<li[^>]*>(?:<a href="([^"#]*)">)?([^<]+)/g)]
            .filter(([, href, name], i, all) => href || i === all.length - 1)
            .map(([, href, name], i) => ({ '@type': 'ListItem', position: i + 1, name: name.replace(/&nbsp;/g, ' ').trim(), item: href ? `${SITE}${href}` : url }));
          tags.push(ldScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }));
        }
        return html.replace('</head>', `${tags.join('\n')}\n</head>`);
      },
    },
  };
}

/* sitemap.xml и robots.txt собираются из списка страниц — новая страница попадает в них сама. */
function sitemapAndRobots() {
  return {
    name: 'sitemap-robots',
    apply: 'build',
    generateBundle() {
      const urls = Object.entries(pages).filter(([key]) => key !== 'notfound').map(([, file]) => `${SITE}${routeOf(file)}`).sort();
      const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n` });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nDisallow:\n\nSitemap: ${SITE}/sitemap.xml\n` });
    },
  };
}

/* В исходниках комментарии в HTML нужны, в опубликованных страницах — нет. */
function stripHtmlComments() {
  return {
    name: 'strip-html-comments',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: (html) => html.replace(/<!--[\s\S]*?-->\n?/g, '') },
  };
}

/* В public/ лежат и запасные фото, которые сейчас ни на одной странице не показаны.
   В сборку попадают только файлы, на которые есть ссылки из страниц, стилей и скриптов. */
function pruneUnusedPublicFiles() {
  let out = join(__dirname, 'dist');
  return {
    name: 'prune-unused-public-files',
    apply: 'build',
    configResolved(c) { out = c.build.outDir.startsWith('/') ? c.build.outDir : join(c.root, c.build.outDir); },
    closeBundle() {
      const texts = [];
      const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const f = join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.(html|css|js)$/.test(e.name)) texts.push(readFileSync(f, 'utf8'));
      });
      walk(out);
      const all = texts.join('\n');
      for (const sub of ['photos', 'fonts']) {
        const d = join(out, sub);
        if (!existsSync(d)) continue;
        for (const f of readdirSync(d)) if (statSync(join(d, f)).isFile() && !all.includes(`${sub}/${f}`)) rmSync(join(d, f));
      }
    },
  };
}

/* Адрес сайта от корня домена. На GitHub Pages сайт живёт в подпапке
   (/karelia-guest-house-website/), локально и на своём домене — в корне.
   Картинки, шрифты и стили Vite переписывает сам; ссылки между страницами
   (href="/…") дописываем здесь. */
/* Сборка для просмотра без сервера (npm run build:local → папка dist-local):
   страницы открываются двойным щелчком, все пути относительные. На хостинг не выкладывается. */
const LOCAL = process.env.LOCAL_FILES === '1';
const base = LOCAL ? './' : process.env.SITE_BASE || '/';
function prefixPageLinks() {
  return {
    name: 'prefix-page-links',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (base === '/' || LOCAL) return html;
        return html.replace(/href="\/(?!\/)/g, (m, off) =>
          html.startsWith(base, off + 6) ? m : `href="${base}`);
      },
    },
  };
}

/* Только для dist-local: ссылки между страницами — относительные и с index.html на конце
   (с диска браузер не открывает папку как страницу), скрипт — обычный, не модуль:
   модули и crossorigin браузер с диска не загружает. */
function localFileLinks() {
  return {
    name: 'local-file-links',
    apply: () => LOCAL,
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const depth = relative(__dirname, ctx.filename).split('/').length - 1;
        const up = '../'.repeat(depth);
        return html
          .replace(/href="\/(?!\/)([^"#]*?)(#[^"]*)?"/g, (m, path, hash = '') => {
            if (/\.[a-z0-9]+$/i.test(path)) return `href="${up}${path}${hash}"`;
            return `href="${up}${path}${path && !path.endsWith('/') ? '/' : ''}index.html${hash}"`;
          })
          .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
          .replace(/ crossorigin(?=[ >])/g, '');
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [partials(), seo(), prefixPageLinks(), localFileLinks(), stripHtmlComments(), sitemapAndRobots(), stripProvenanceSidecars(), pruneUnusedPublicFiles()],
  server: { port: 5188, host: '127.0.0.1' },
  build: {
    outDir: LOCAL ? 'dist-local' : 'dist',
    // С диска CSS-маски из отдельных файлов не грузятся — в dist-local встраиваем их в стили.
    assetsInlineLimit: LOCAL ? 100 * 1024 : 2048,
    rollupOptions: {
      input: pages,
    },
  },
});
