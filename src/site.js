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

/* --- просмотр фотографий -------------------------------------------- */
const lb = document.getElementById('lb');
if (lb && typeof lb.showModal === 'function') {
  const img = lb.querySelector('.lb__img');
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-full]');
    if (!link) return;
    e.preventDefault();
    const thumb = link.querySelector('img');
    img.src = link.getAttribute('href');
    img.alt = thumb ? thumb.alt : '';
    lb.showModal();
  });
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.closest('.lb__close')) lb.close();
  });
  lb.addEventListener('close', () => { img.removeAttribute('src'); });
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
