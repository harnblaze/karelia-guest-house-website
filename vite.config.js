import { defineConfig } from 'vite';
import { readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Страницы сайта: каждая папка с index.html (корень — главная).
   Новая страница — просто новая папка, конфиг править не нужно. */
const skip = new Set(['node_modules', 'dist', 'public', 'src', 'scripts', 'archive', 'research', 'videos']);
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
  return {
    name: 'strip-provenance-sidecars',
    closeBundle() {
      const d = join('dist', 'photos');
      if (!existsSync(d)) return;
      for (const f of readdirSync(d)) if (f.endsWith('.json')) rmSync(join(d, f));
    },
  };
}

/* Адрес сайта от корня домена. На GitHub Pages сайт живёт в подпапке
   (/karelia-guest-house-website/), локально и на своём домене — в корне.
   Картинки, шрифты и стили Vite переписывает сам; ссылки между страницами
   (href="/…") дописываем здесь. */
const base = process.env.SITE_BASE || '/';
function prefixPageLinks() {
  return {
    name: 'prefix-page-links',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (base === '/') return html;
        return html.replace(/href="\/(?!\/)/g, (m, off) =>
          html.startsWith(base, off + 6) ? m : `href="${base}`);
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [partials(), prefixPageLinks(), stripProvenanceSidecars()],
  server: { port: 5188, host: '127.0.0.1' },
  build: {
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: pages,
    },
  },
});
