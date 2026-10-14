/* The Quiet Room — головна: картки, мови, пошук, читати далі */
(function () {
  'use strict';
  var L = (localStorage.getItem('tqr_lang') || 'uk');
  if (['uk', 'en'].indexOf(L) === -1) L = 'uk';

  var I18N = {
    uk: {
      brand: 'The Quiet Room', nav_home: 'Головна', nav_collection: 'Колекція', nav_about: 'Про нас', nav_contact: 'Контакти',
      search_ph: 'Пошук принта…',
      head_title: 'принти для тиші',
      head_sub: 'Цифрові файли принтів для друку на замовлення. Купуєте один раз — друкуєте безліч разів.',
      desc_p1: 'Друк на замовлення (print on demand) змінив правила гри: ніяких складів, ніяких мінімальних партій, ніякого ризику залишитися з коробкою футболок, які ніхто не купив. Ви завантажуєте файл — покупець замовляє річ — платформа друкує й відправляє. Єдине, що потрібно від вас, — дизайн, який зачіпає людей.',
      desc_p2: 'Саме це і є ця колекція. Принти The Quiet Room створені під реальний POD-процес: прозорий фон, роздільність 4500×5400 px (300 dpi), формати PNG + SVG. Файл одразу готовий до завантаження у Printify, Printful, Redbubble чи будь-який інший сервіс — без підготовки з вашого боку.',
      desc_p3: 'Кожен файл — миттєва цифрова завантаження. Жодних передплат, очікування і доставки: ви купуєте, завантажуєте і одразу заливаєте файл у вашу платформу.',
      read_more: 'Читати далі ▼', read_less: 'Згорнути ▲',
      buy_btn: 'Купити на BlackSea', not_found: 'Нічого не знайдено за запитом',
      reg_price: 'Звичайна ціна', sale_price: 'Ціна зі знижкою',
      note_text: '🙂 Переконайтесь, що ваша пошта правильна при оформленні замовлення на BlackSea — файл з принтом прийде на неї одразу після оплати.',
      footer_tag: 'Метафора домашнього затишку, в якому висять ваші роботи.',
      footer_shop: 'Магазин', footer_buy: 'Купити на BlackSea', footer_help: 'Підтримка', footer_faq: 'Питання-відповіді'
    },
    en: {
      brand: 'The Quiet Room', nav_home: 'Home', nav_collection: 'Collection', nav_about: 'About', nav_contact: 'Contact',
      search_ph: 'Search prints…',
      head_title: 'prints for stillness',
      head_sub: 'Digital print files for print on demand. Buy once — print forever.',
      desc_p1: 'Print on demand has fundamentally changed what it means to run a product business. No inventory. No upfront manufacturing costs. No minimum order quantities. No risk of being stuck with a box of t-shirts nobody bought. You upload a file — a customer places an order — the platform prints and ships it. All it takes from you is design that connects with people.',
      desc_p2: 'That is exactly what this collection delivers. The Quiet Room prints are built for the real POD workflow: transparent background, 4500×5400 px (300 dpi), PNG + SVG formats. The file is instantly ready to upload to Printify, Printful, Redbubble or any other service — no preparation on your end.',
      desc_p3: 'Every file is an instant digital download. No subscriptions, no waiting, no shipping: you buy, you download, and you are uploading to your platform immediately.',
      read_more: 'Read more ▼', read_less: 'Collapse ▲',
      buy_btn: 'Buy on BlackSea', not_found: 'Nothing found for your search',
      reg_price: 'Regular price', sale_price: 'Sale price',
      note_text: '🙂 Make sure your email is valid when you check out on BlackSea — the print file will be delivered to it right after payment.',
      footer_tag: 'A metaphor of home comfort, with your works hanging inside.',
      footer_shop: 'Shop', footer_buy: 'Buy on BlackSea', footer_help: 'Support', footer_faq: 'FAQ'
    }
  };

  function t(key) { return (I18N[L] && I18N[L][key]) || key; }

  function lang() {
    document.documentElement.lang = L;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    document.title = t('brand') + ' — ' + t('head_title');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  /* ---------- Картки товарів ---------- */
  function renderCatalog(filter) {
    var grid = document.getElementById('catalog');
    if (!grid) return;
    var q = (filter || '').trim().toLowerCase();
    var out = '';
    window.TQR_PRODUCTS.forEach(function (p, i) {
      var hay = (p.name_uk + ' ' + p.name_en + ' ' + p.tag_uk + ' ' + p.tag_en).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      var name = L === 'uk' ? p.name_uk : p.name_en;
      var tag = L === 'uk' ? p.tag_uk : p.tag_en;
      var badge = L === 'uk' ? p.badge_uk : p.badge_en;
      out += '<article class="card" data-cat="' + esc(q) + '">'
        + '<div class="card-media"><span class="card-badge">' + esc(badge) + '</span>'
        + '<img loading="lazy" src="' + esc(p.img) + '" alt="' + esc(name) + ' — принт The Quiet Room" width="500" height="625"></div>'
        + '<div class="card-body">'
        + '<p class="card-tag">' + esc(tag) + '</p>'
        + '<h2 class="card-title">' + esc(name) + '</h2>'
        + '<p class="card-desc"></p>'
        + '<div class="card-price-row"><span class="price-sale">' + esc(p.price) + ' ₴</span>'
        + (p.old ? '<span class="price-old">' + esc(p.old) + ' ₴</span><span class="price-cur">' + (L === 'uk' ? 'акція' : 'sale') + '</span>' : '')
        + '</div>'
        + '<a class="card-btn" href="' + esc(window.TQR_BUY) + '" target="_blank" rel="noopener">' + esc(t('buy_btn')) + '</a>'
        + '</div></article>';
    });
    if (!out) out = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 0">' + esc(t('not_found')) + '</p>';
    grid.innerHTML = out;
  }

  /* ---------- Мови ---------- */
  function setLang(l) {
    if (l === L) return;
    L = l;
    localStorage.setItem('tqr_lang', l);
    document.querySelectorAll('.lang-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === l); });
    lang();
    renderCatalog();
  }

  /* ---------- Пошук ---------- */
  var debounce = null;
  document.addEventListener('DOMContentLoaded', function () {
    lang();
    renderCatalog();
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    var input = document.getElementById('search-input');
    if (input) {
      input.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () { renderCatalog(input.value); }, 180);
      });
    }
    var rm = document.getElementById('read-more');
    var dt = document.getElementById('desc-text');
    if (rm && dt) {
      if (dt.scrollHeight <= 152) { rm.style.display = 'none'; }
      rm.addEventListener('click', function () {
        var open = dt.classList.toggle('short');
        rm.textContent = open ? t('read_more') : t('read_less');
      });
      dt.classList.add('short');
    }
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  });
})();