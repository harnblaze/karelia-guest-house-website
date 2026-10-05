/* Фон первого экрана главной выбирается до отрисовки, чтобы не мигало летнее фото:
   ноябрь–март — зима, остальные месяцы — лето. Выбор посетителя (кнопки «Лето / Зима / Видео»,
   запоминаются в браузере) и ссылка /?bg=winter|summer|video важнее календаря.
   Скрипт обычный и стоит сразу после картинки — так он успевает до её загрузки. */
(function () {
  var img = document.querySelector('.hero__bg');
  if (!img) return;
  var keys = { summer: 1, winter: 1, video: 1 };
  var key = new URLSearchParams(location.search).get('bg');
  if (!keys[key]) { try { key = localStorage.getItem('hero-bg'); } catch (e) { key = null; } }
  if (!keys[key]) { var m = new Date().getMonth() + 1; key = m >= 11 || m <= 3 ? 'winter' : 'summer'; }
  document.documentElement.setAttribute('data-hero-bg', key);
  var base = (document.currentScript && document.currentScript.src || '').replace(/hero-season\.js.*$/, '');
  var photo = function (n, w) {
    img.srcset = base + 'photos/' + n + '@sm.webp 900w, ' + base + 'photos/' + n + '@md.webp 1400w, ' + base + 'photos/' + n + '.webp ' + w + 'w';
    img.src = base + 'photos/' + n + '.webp';
  };
  if (key === 'winter') {
    photo('hero-winter-3', 1536);
    img.alt = 'Гостевые дома на заснеженной поляне среди леса, на крыльце горят гирлянды';
  } else if (key === 'video') {
    img.removeAttribute('srcset');
    img.src = base + 'video/hero-loop-poster.webp';
    img.alt = 'Поляна с гостевыми домами летом и зимой';
  } else {
    photo('hero-summer', 2000);
  }
})();
