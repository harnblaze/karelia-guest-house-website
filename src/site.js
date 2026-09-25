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
    img.removeAttribute('src');
    if (opener) opener.focus();
  });
}


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
  const layers = [...heroSection.querySelectorAll('.hero__bg, .hero__video, .phero__bg')];
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
    '.key, .obj__text, .aside, .road .titled, .flat__info, .map__note, .places li, .route .near__h',
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

/* --- ВРЕМЕННО: переключатель фона первого экрана ---------------------
   Для показа клиенту: кнопки «Зима / Лето / Видео» или ссылки /?bg=2, /?bg=3.
   Выбор запоминается в браузере. После решения удалить этот блок,
   разметку .bgswitch в index.html и её стили. */
const bgSwitch = document.querySelector('.bgswitch');
const heroBg = document.querySelector('.hero__bg');
const heroVideo = document.querySelector('.hero__video');
if (bgSwitch && heroBg) {
  const base = import.meta.env.BASE_URL;
  const variants = {
    1: { name: 'hero-winter-2', alt: 'Большой гостевой дом на заснеженной поляне среди леса, за ним домик на троих и баня' },
    2: { name: 'hero-summer', alt: 'Большой гостевой дом на летней поляне, рядом геокупол и лес' },
    3: { video: true },
  };
  // Видео не запускаем тем, кто просит меньше движения или экономит трафик — им остаётся заставка.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData);
  const poster = `${base}video/hero-loop-poster.webp`;
  const files = (v) => (v.video
    ? { srcset: '', src: poster }
    : { srcset: `${base}photos/${v.name}@sm.webp 900w, ${base}photos/${v.name}.webp 2000w`, src: `${base}photos/${v.name}.webp` });
  // Фото загружаем заранее и подставляем, когда оно готово: иначе на медленной связи
  // кнопка уже переключилась, а на экране ещё несколько секунд прежний фон.
  const loaded = new Map();
  const preload = (key) => {
    const v = variants[key] || variants[1];
    if (!loaded.has(key)) {
      const { srcset, src } = files(v);
      const img = new Image();
      img.sizes = heroBg.sizes || '100vw';
      if (srcset) img.srcset = srcset;
      img.src = src;
      loaded.set(key, (img.decode ? img.decode() : Promise.resolve()).catch(() => {}));
    }
    return loaded.get(key);
  };
  const setImage = (v) => {
    const { srcset, src } = files(v);
    if (srcset) heroBg.srcset = srcset; else heroBg.removeAttribute('srcset');
    heroBg.src = src;
  };
  let pending = 0;
  const apply = async (key) => {
    const v = variants[key] || variants[1];
    const mine = ++pending;
    bgSwitch.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bg === String(key))));
    bgSwitch.setAttribute('aria-busy', 'true');
    await preload(key);
    if (mine !== pending) return; // пока грузилось, выбрали другой фон
    bgSwitch.removeAttribute('aria-busy');
    if (v.video && heroVideo) {
      setImage(v);
      heroBg.alt = 'Поляна с гостевыми домами летом и зимой';
      if (!calm) {
        if (!heroVideo.firstChild) {
          heroVideo.poster = poster;
          heroVideo.innerHTML = `<source src="${base}video/hero-loop.webm" type="video/webm"><source src="${base}video/hero-loop.mp4" type="video/mp4">`;
          heroVideo.preload = 'auto';
          heroVideo.load();
        }
        heroVideo.hidden = false;
        heroVideo.play().catch(() => {});
      }
    } else {
      if (heroVideo) { heroVideo.pause(); heroVideo.hidden = true; }
      setImage(v);
      heroBg.alt = v.alt;
    }
    try { localStorage.setItem('hero-bg', String(key)); } catch (e) { /* без хранилища просто не запоминаем */ }
  };
  let start = new URLSearchParams(location.search).get('bg');
  if (!start) { try { start = localStorage.getItem('hero-bg'); } catch (e) { /* нет хранилища */ } }
  if (start && variants[start] && start !== '1') apply(start);
  bgSwitch.addEventListener('click', (e) => { const b = e.target.closest('button[data-bg]'); if (b) apply(b.dataset.bg); });
  // Начинаем загрузку уже при наведении или касании — к нажатию фото часто готово.
  ['pointerover', 'focusin'].forEach((type) => bgSwitch.addEventListener(type, (e) => { const b = e.target.closest('button[data-bg]'); if (b) preload(b.dataset.bg); }));
}
