/* The Quiet Room — шапка-скролл, пошук, фільтри, сортування, пагінація, сторінка товару, підписка */
(function () {
  'use strict';

  var PRODUCTS = window.TQR_PRODUCTS || [];
  var PER_PAGE = 8;
  var state = { q: '', cat: '', price: '', sort: 'featured', page: 1 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  /* ---------- Шапка: ховається вниз, з'являється вгору ---------- */
  var header = document.getElementById('site-header');
  var lastY = window.pageYOffset;
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset;
    if (!ticking) {
      window.requestAnimationFrame(function () {
        if (!header) return;
        if (y > lastY && y > 120) header.classList.add('hidden');
        else header.classList.remove('hidden');
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Бургер (мобільне меню) ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('site-nav');
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.toggle('open'); });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  /* ---------- Пошук: лупа відкриває поле ---------- */
  var st = document.getElementById('search-toggle');
  var sp = document.getElementById('search-panel');
  var si = document.getElementById('search-input');
  if (st && sp) {
    st.addEventListener('click', function (e) {
      e.stopPropagation();
      sp.classList.toggle('open');
      if (sp.classList.contains('open') && si) si.focus();
    });
    document.addEventListener('click', function (e) {
      if (sp.classList.contains('open') && !sp.contains(e.target) && !st.contains(e.target)) {
        sp.classList.remove('open');
      }
    });
  }
  if (si) {
    si.addEventListener('input', function () {
      state.q = si.value.trim().toLowerCase();
      state.page = 1;
      renderGrid();
    });
  }

  /* ---------- Фільтри та сортування ---------- */
  function bindSelect(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      state[key] = el.value;
      state.page = 1;
      renderGrid();
    });
  }
  bindSelect('f-cat', 'cat');
  bindSelect('f-price', 'price');
  bindSelect('f-sort', 'sort');

  /* ---------- Фільтрація + сортування ---------- */
  function applyFilters() {
    var list = PRODUCTS.slice();
    if (state.q) list = list.filter(function (p) {
      return (p.name + ' ' + p.cat).toLowerCase().indexOf(state.q) !== -1;
    });
    if (state.cat) list = list.filter(function (p) { return p.cat === state.cat; });
    if (state.price === 'sale') list = list.filter(function (p) { return p.old > 0; });
    if (state.price === '55') list = list.filter(function (p) { return p.price <= 60; });
    switch (state.sort) {
      case 'az': list.sort(function (a, b) { return a.name.localeCompare(b.name, 'uk'); }); break;
      case 'za': list.sort(function (a, b) { return b.name.localeCompare(a.name, 'uk'); }); break;
      case 'lo': list.sort(function (a, b) { return a.price - b.price; }); break;
      case 'hi': list.sort(function (a, b) { return b.price - a.price; }); break;
      case 'new': list.sort(function (a, b) { return b.order - a.order; }); break;
      default: list.sort(function (a, b) { return a.order - b.order; });
    }
    return list;
  }

  /* ---------- Картка (скелет як у Quick Digital Files) ---------- */
  function cardHTML(p) {
    return '<article class="card">'
      + '<a class="card-media" href="product.html?id=' + esc(p.id) + '">'
      + (p.badge ? '<span class="card-badge">' + esc(p.badge) + '</span>' : '')
      + '<img loading="lazy" src="' + esc(p.img) + '" alt="' + esc(p.name) + ' — принт The Quiet Room" width="500" height="625">'
      + '</a>'
      + '<div class="card-body">'
      + '<a class="card-title" href="product.html?id=' + esc(p.id) + '">' + esc(p.name) + '</a>'
      + '<p class="card-formats">' + esc(p.formats) + ' · 300 dpi</p>'
      + '<div class="card-price-row">'
      + '<span class="price-sale">' + esc(p.price) + ' ₴</span>'
      + (p.old ? '<span class="price-old">' + esc(p.old) + ' ₴</span>' : '')
      + (p.old ? '<span class="card-formats">' + (Math.round((1 - p.price / p.old) * 100)) + '% знижка</span>' : '')
      + '</div>'
      + '<a class="card-btn" href="' + esc(window.TQR_BUY) + '">Купити на BlackSea</a>'
      + '</div></article>';
  }

  /* ---------- Сітка + пагінація ---------- */
  var grid = document.getElementById('catalog');
  var pag = document.getElementById('pagination');
  var count = document.getElementById('count');

  function renderGrid() {
    if (!grid) return;
    var list = applyFilters();
    var totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PER_PAGE;
    var pageItems = list.slice(start, start + PER_PAGE);
    if (count) count.textContent = list.length + (list.length === 1 ? ' товар' : ' товарів');
    grid.innerHTML = pageItems.length
      ? pageItems.map(cardHTML).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 0">Нічого не знайдено за запитом</p>';
    if (pag) {
      var p = '';
      if (state.page > 1) p += '<a href="#" data-p="' + (state.page - 1) + '">←</a>';
      for (var i = 1; i <= totalPages; i++) {
        p += i === state.page
          ? '<span class="cur">' + i + '</span>'
          : '<a href="#" data-p="' + i + '">' + i + '</a>';
      }
      if (state.page < totalPages) p += '<a href="#" data-p="' + (state.page + 1) + '">→</a>';
      pag.innerHTML = p;
    }
  }
  if (pag) {
    pag.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-p]');
      if (!a) return;
      e.preventDefault();
      state.page = parseInt(a.getAttribute('data-p'), 10);
      renderGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Читати далі ---------- */
  var rm = document.getElementById('read-more');
  var hd = document.getElementById('head-desc');
  if (rm && hd) {
    if (hd.scrollHeight <= hd.clientHeight + 4) rm.style.display = 'none';
    rm.addEventListener('click', function () {
      var open = hd.classList.toggle('open');
      rm.textContent = open ? 'Згорнути ▲' : 'Читати далі ▼';
    });
  }

  /* ---------- Підписка ---------- */
  var sf = document.getElementById('sub-form');
  var sok = document.getElementById('sub-ok');
  if (sf) {
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('sub-email');
      if (email && email.value.indexOf('@') > 0) {
        try { localStorage.setItem('tqr_sub', email.value.trim()); } catch (err) {}
        if (sok) sok.hidden = false;
        sf.reset();
      }
    });
  }

  /* ---------- Сторінка товару ---------- */
  function renderProduct() {
    var page = document.getElementById('product-page');
    if (!page) return;
    var params = new URLSearchParams(window.location.search);
    var p = null;
    var id = params.get('id');
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) { p = PRODUCTS[i]; break; }
    }
    if (!p) {
      page.innerHTML = '<p style="padding:60px 0;text-align:center;color:var(--muted)">Товар не знайдено. <a href="index.html" style="color:var(--wine);text-decoration:underline">На головну</a></p>';
      return;
    }
    document.title = p.name + ' — The Quiet Room';
    var related = PRODUCTS.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
    page.innerHTML =
      '<div class="product-layout">'
      + '<div class="product-media"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" width="560" height="700"></div>'
      + '<div class="product-info">'
      + '<p class="product-cat">' + esc(p.cat) + '</p>'
      + '<h1>' + esc(p.name) + '</h1>'
      + '<div class="product-price">'
      + '<span class="price-sale">' + esc(p.price) + ' ₴</span>'
      + (p.old ? '<span class="price-old">' + esc(p.old) + ' ₴</span><span class="card-formats">' + (Math.round((1 - p.price / p.old) * 100)) + '% знижка</span>' : '')
      + '</div>'
      + '<p class="product-formats">Формати: ' + esc(p.formats) + ' · Роздільність 4500×5400 px · 300 dpi · Прозорий фон</p>'
      + '<div class="product-desc">'
      + '<p>Цифровий файл принта «' + esc(p.name) + '» у фірмовій стилістиці The Quiet Room. Підходить для друку на футболках, худі, кухлях, постерах і будь-яких інших носіях.</p>'
      + '<p>Купуєте один раз — друкуєте безліч разів. Після оплати файл миттєво приходить на вашу пошту, а також зберігається у бібліотеці BlackSea.</p>'
      + '</div>'
      + '<ul class="product-feats">'
      + '<li><i class="fa-solid fa-circle-check"></i>Миттєва доставка на email після оплати</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>Готовий до завантаження у Printify, Printful, Redbubble</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>Персональне використання та малий бізнес</li>'
      + '</ul>'
      + '<a class="product-buy" href="' + esc(window.TQR_BUY) + '">Купити на BlackSea — ' + esc(p.price) + ' ₴</a>'
      + '<p class="product-safe"><i class="fa-solid fa-lock"></i> Безпечна оплата карткою · 3-D Secure</p>'
      + '</div></div>'
      + '<section class="product-related"><h2>Схожі принти</h2><div class="grid">'
      + related.map(cardHTML).join('')
      + '</div></section>';
  }

  /* ---------- Старт ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderGrid();
    renderProduct();
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  });
})();