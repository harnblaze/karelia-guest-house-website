/* Общее поведение всех страниц: мобильное меню, просмотр фотографий, нижняя панель связи. */

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

/* --- ВРЕМЕННО: переключатель фона первого экрана ---------------------
   Для показа клиенту: кнопки «Зима / Лето» или ссылка /?bg=2.
   Выбор запоминается в браузере. После решения удалить этот блок,
   разметку .bgswitch в index.html и её стили. */
const bgSwitch = document.querySelector('.bgswitch');
const heroBg = document.querySelector('.hero__bg');
if (bgSwitch && heroBg) {
  const variants = {
    1: { name: 'hero-winter-2', alt: 'Большой гостевой дом на заснеженной поляне среди леса, за ним домик на троих и баня' },
    2: { name: 'hero-summer', alt: 'Большой гостевой дом на летней поляне, рядом геокупол и лес' },
  };
  const base = import.meta.env.BASE_URL;
  const apply = (key) => {
    const v = variants[key] || variants[1];
    heroBg.srcset = `${base}photos/${v.name}@sm.webp 900w, ${base}photos/${v.name}.webp 2000w`;
    heroBg.src = `${base}photos/${v.name}.webp`;
    heroBg.alt = v.alt;
    bgSwitch.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bg === String(key))));
    try { localStorage.setItem('hero-bg', String(key)); } catch (e) { /* без хранилища просто не запоминаем */ }
  };
  let start = new URLSearchParams(location.search).get('bg');
  if (!start) { try { start = localStorage.getItem('hero-bg'); } catch (e) { /* нет хранилища */ } }
  if (start && variants[start] && start !== '1') apply(start);
  bgSwitch.addEventListener('click', (e) => { const b = e.target.closest('button[data-bg]'); if (b) apply(b.dataset.bg); });
}
