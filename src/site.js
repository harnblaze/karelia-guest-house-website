/* Общее поведение всех страниц: мобильное меню, просмотр фотографий, нижняя панель связи,
   движение при прокрутке. */

/* --- меню ------------------------------------------------------------ */
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');

if (burger && nav) {
  // На узких экранах меню — выдвижная панель. Закрытая, она лишь сдвинута
  // за край экрана, поэтому делаем её недоступной для фокуса и дикторов (inert).
  const narrow = window.matchMedia('(max-width: 1100px)');
  const isOpen = () => burger.getAttribute('aria-expanded') === 'true';
  const syncInert = () => { nav.inert = narrow.matches && !isOpen(); };
  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('menu-open', open);
    syncInert();
  };
  burger.addEventListener('click', () => setOpen(!isOpen()));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); burger.focus(); }
  });
  narrow.addEventListener('change', () => { if (!narrow.matches) setOpen(false); else syncInert(); });
  syncInert();
}

/* --- просмотр фотографий --------------------------------------------
   Листается в пределах своей галереи: кнопки, стрелки ← →, свайп.
   После закрытия фокус возвращается на миниатюру. */
const lb = document.getElementById('lb');
if (lb && typeof lb.showModal === 'function') {
  const img = lb.querySelector('.lb__img');
  const blank = img.getAttribute('src'); // пустая картинка-заглушка из разметки, пока окно закрыто
  const txt = lb.querySelector('.lb__txt');
  const count = lb.querySelector('.lb__count');
  const navs = lb.querySelectorAll('.lb__nav');
  let set = [];
  let i = 0;
  let opener = null;

  const show = (n) => {
    i = (n + set.length) % set.length;
    const link = set[i];
    const thumb = link.querySelector('img');
    img.src = link.getAttribute('href');
    img.alt = thumb ? thumb.alt : '';
    txt.textContent = img.alt;
    count.textContent = set.length > 1 ? `${i + 1} из ${set.length}` : '';
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-full]');
    if (!link) return;
    e.preventDefault();
    const group = link.parentElement;
    set = [...group.querySelectorAll('a[data-full]')];
    opener = link;
    navs.forEach((b) => { b.hidden = set.length < 2; });
    show(set.indexOf(link));
    lb.showModal();
  });

  lb.addEventListener('click', (e) => {
    if (e.target.closest('.lb__prev')) return show(i - 1);
    if (e.target.closest('.lb__next')) return show(i + 1);
    if (e.target === lb || e.target.closest('.lb__close')) lb.close();
  });
  lb.addEventListener('keydown', (e) => {
    if (set.length < 2) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
  });

  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null || set.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  lb.addEventListener('close', () => {
    img.src = blank;
    if (opener) opener.focus();
  });
}


/* --- горизонтальные ленты на телефоне ---------------------------------
   До 720 px отзывы, условия, фото природы и места рядом листаются вбок.
   Ленту без ссылок внутри иначе не прокрутить с клавиатуры — даём ей фокус и имя. */
const ribbons = document.querySelectorAll('.revs__grid, .nature__grid, .spots, .stay__grid');
if (ribbons.length) {
  const narrowRibbons = matchMedia('(max-width: 720px)');
  const syncRibbons = () => ribbons.forEach((el) => {
    if (narrowRibbons.matches) {
      const head = el.closest('section')?.querySelector('h2');
      el.tabIndex = 0;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', `${head ? head.textContent.trim() : 'Лента'}, листается вбок`);
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.removeAttribute('aria-label');
    }
  });
  narrowRibbons.addEventListener('change', syncRibbons);
  syncRibbons();
}

/* --- галереи квартир на телефоне --------------------------------------
   Видны три фото из пяти: на третьем метка «+2» (показывает CSS до 720 px). */
document.querySelectorAll('.flat__gal').forEach((gal) => {
  const links = gal.querySelectorAll('a[data-full]');
  if (links.length > 3) links[2].dataset.more = `+${links.length - 3}`;
});

/* --- нижняя панель связи ------------------------------------------------
   Видна, когда первый экран уже прокручен, а блок «Напишите нам» и подвал
   ещё не на экране. Пока скрыта — недоступна для фокуса. */
const dock = document.querySelector('[data-dock]');
if (dock && 'IntersectionObserver' in window) {
  const hero = document.querySelector('.hero, .phero');
  const ends = [document.getElementById('svyaz'), document.querySelector('.foot')].filter(Boolean);
  const seen = new Map();
  const update = () => {
    const heroVisible = hero ? seen.get(hero) : false;
    const endVisible = ends.some((el) => seen.get(el));
    const on = !heroVisible && !endVisible;
    dock.classList.toggle('is-on', on);
    dock.inert = !on;
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    update();
  });
  [hero, ...ends].filter(Boolean).forEach((el) => io.observe(el));
  dock.inert = true;
}

/* --- шапка после первого экрана ------------------------------------------
   Пока виден первый экран, шапка лежит поверх фото. Дальше — закреплена
   сверху светлой панелью; на телефоне прячется при прокрутке вниз. */
const topBar = document.querySelector('.top');
const firstScreen = document.querySelector('.hero, .phero');
if (topBar && firstScreen) {
  const narrowTop = matchMedia('(max-width: 1100px)');
  let lastY = window.scrollY;
  let queuedTop = false;
  const updateTop = () => {
    queuedTop = false;
    const y = window.scrollY;
    const solid = y > firstScreen.offsetHeight - 80;
    topBar.classList.toggle('top--solid', solid);
    if (!solid || !narrowTop.matches || y < lastY - 4) topBar.classList.remove('top--hidden');
    else if (y > lastY + 4 && !document.body.classList.contains('menu-open')) topBar.classList.add('top--hidden');
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!queuedTop) { queuedTop = true; requestAnimationFrame(updateTop); } }, { passive: true });
  narrowTop.addEventListener('change', updateTop);
  updateTop();
}

/* --- движение при прокрутке ------------------------------------------
   Параллакс первого экрана и появление блоков. Тем, кто просит меньше
   движения, всё показано сразу и неподвижно. */
const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const heroSection = document.querySelector('.hero, .phero');
if (heroSection && !calmMotion) {
  const layers = [...heroSection.querySelectorAll('.hero__bg, .phero__bg')];
  const inner = heroSection.querySelector('.hero__in, .phero__in');
  let queued = false;
  const paint = () => {
    queued = false;
    const h = heroSection.offsetHeight;
    const y = Math.min(Math.max(window.scrollY, 0), h);
    const p = y / h;
    // Фон уходит медленнее страницы и чуть приближается; текст отстаёт меньше и растворяется.
    layers.forEach((el) => { el.style.transform = `translate3d(0, ${y * .42}px, 0) scale(${1 + p * .06})`; });
    if (inner) {
      inner.style.transform = `translate3d(0, ${y * .2}px, 0)`;
      inner.style.opacity = String(Math.max(0, 1 - p * 1.1));
    }
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint();
}

if (!calmMotion && 'IntersectionObserver' in window) {
  const up = [...document.querySelectorAll([
    // главная
    '.pill, .head, .revs__text, .card, .rev, .nature__text, .near, .extras, .spot, .region__more',
    '.stay__col, .stay__note, .where .titled, .where__lead, .dist div, .go, .map, .cta__text, .cta .chan',
    // внутренние страницы
    '.key, .obj__text, .aside, .road .titled, .flat__info, .flats-info__grid > div, .map__note, .places li, .route .near__h',
  ].join(', '))];
  const photos = [...document.querySelectorAll('.card__ph, .nature__grid figure, .land__grid figure, .spot, .gal__grid a, .flat__gal a')];
  // Уже прокрученное выше экрана (переход по якорю, возврат назад) не прячем.
  const ahead = (el) => el.getBoundingClientRect().bottom >= 0;
  up.filter(ahead).forEach((el) => el.classList.add('rv'));
  photos.filter(ahead).forEach((el) => el.classList.add('rvi'));
  const all = [...document.querySelectorAll('.rv, .rvi')];
  document.documentElement.classList.add('rv-on');

  const io = new IntersectionObserver((entries) => {
    // Одновременно вошедшие блоки проявляются по очереди.
    entries.filter((e) => e.isIntersecting).forEach((e, k) => {
      const el = e.target;
      const delay = Math.min(k, 5) * 90;
      el.style.setProperty('--d', `${delay}ms`);
      el.classList.add('is-in');
      io.unobserve(el);
      // Когда блок проявился, возвращаем ему обычные стили — иначе они мешают эффектам наведения.
      setTimeout(() => { el.classList.remove('rv', 'rvi', 'is-in'); el.style.removeProperty('--d'); }, delay + 1800);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  all.forEach((el) => io.observe(el));
}
