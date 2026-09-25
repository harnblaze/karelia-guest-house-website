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

/* --- движение при прокрутке ------------------------------------------
   Параллакс первого экрана и появление блоков. Тем, кто просит меньше
   движения, всё показано сразу и неподвижно. */
const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const heroSection = document.querySelector('.hero');
if (heroSection && !calmMotion) {
  const layers = [...heroSection.querySelectorAll('.hero__bg, .hero__video')];
  const inner = heroSection.querySelector('.hero__in');
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
  const up = [...document.querySelectorAll('.pill, .head, .revs__text, .card, .rev, .nature__text, .near, .extras, .spot, .region__more, .stay__col, .stay__note, .where .titled, .where__lead, .dist div, .go, .where .map, .cta__text, .cta .chan')];
  const photos = [...document.querySelectorAll('.card__ph, .nature__grid figure, .land__grid figure, .spot')];
  const all = [...up, ...photos];
  up.forEach((el) => el.classList.add('rv'));
  photos.forEach((el) => el.classList.add('rvi'));
  // Уже прокрученное выше экрана (переход по якорю, возврат назад) не прячем.
  all.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('is-in'); });
  document.documentElement.classList.add('rv-on');

  const io = new IntersectionObserver((entries) => {
    // Одновременно вошедшие блоки проявляются по очереди.
    entries.filter((e) => e.isIntersecting).forEach((e, k) => {
      e.target.style.setProperty('--d', `${Math.min(k, 5) * 90}ms`);
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  all.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
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
  const setImage = (name, alt) => {
    heroBg.srcset = `${base}photos/${name}@sm.webp 900w, ${base}photos/${name}.webp 2000w`;
    heroBg.src = `${base}photos/${name}.webp`;
    heroBg.alt = alt;
  };
  const apply = (key) => {
    const v = variants[key] || variants[1];
    if (v.video && heroVideo) {
      heroBg.removeAttribute('srcset');
      heroBg.src = `${base}video/hero-loop-poster.webp`;
      heroBg.alt = 'Поляна с гостевыми домами летом и зимой';
      if (!calm) {
        if (!heroVideo.firstChild) {
          heroVideo.poster = `${base}video/hero-loop-poster.webp`;
          heroVideo.innerHTML = `<source src="${base}video/hero-loop.webm" type="video/webm"><source src="${base}video/hero-loop.mp4" type="video/mp4">`;
          heroVideo.preload = 'auto';
          heroVideo.load();
        }
        heroVideo.hidden = false;
        heroVideo.play().catch(() => {});
      }
    } else {
      if (heroVideo) { heroVideo.pause(); heroVideo.hidden = true; }
      setImage(v.name, v.alt);
    }
    bgSwitch.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bg === String(key))));
    try { localStorage.setItem('hero-bg', String(key)); } catch (e) { /* без хранилища просто не запоминаем */ }
  };
  let start = new URLSearchParams(location.search).get('bg');
  if (!start) { try { start = localStorage.getItem('hero-bg'); } catch (e) { /* нет хранилища */ } }
  if (start && variants[start] && start !== '1') apply(start);
  bgSwitch.addEventListener('click', (e) => { const b = e.target.closest('button[data-bg]'); if (b) apply(b.dataset.bg); });
}
