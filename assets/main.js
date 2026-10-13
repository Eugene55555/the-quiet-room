/* The Quiet Room — общие интеракции */
(function () {
  'use strict';

  /* --- Toast --- */
  var toastEl = null;
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }
  window.TQRToast = toast;

  /* --- Язык --- */
  if (window.TQR_I18N) TQR_I18N.init();

  function T(key) {
    var lang = window.TQR_I18N ? TQR_I18N.detect() : 'uk';
    return window.TQR_I18N ? TQR_I18N.t(lang, key) : key;
  }

  /* --- Мобильное меню --- */
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('site-nav-mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        burger.classList.remove('open');
      }
    });
  }

  /* --- Корзина (заглушка до открытия магазина) --- */
  var cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function () { toast(T('cart_hint')); });
  }

  /* --- Поиск --- */
  var searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = searchForm.querySelector('input');
      var q = (input.value || '').trim();
      var isCollection = /collection\.html/.test(location.pathname);
      if (isCollection) applySearch(q);
      else location.href = 'collection.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  function applySearch(q) {
    var cards = document.querySelectorAll('#catalog .card');
    var ql = q.toLowerCase();
    var any = false;
    cards.forEach(function (card) {
      var hay = (card.getAttribute('data-name') || '').toLowerCase() + ' ' + (card.getAttribute('data-tag') || '').toLowerCase();
      var hit = !ql || hay.indexOf(ql) !== -1;
      card.style.display = hit ? '' : 'none';
      if (hit) any = true;
    });
    var empty = document.getElementById('search-empty');
    if (empty) empty.style.display = any ? 'none' : 'block';
    var grid = document.getElementById('catalog');
    if (grid) grid.setAttribute('data-has-visible', any ? '1' : '0');
  }

  /* --- Коллекция: фильтры --- */
  var activeFilter = 'all';
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      render();
    });
  });

  /* --- Коллекция: сортировка --- */
  var sortSel = document.getElementById('sort');
  if (sortSel) {
    sortSel.addEventListener('change', render);
  }

  function render() {
    var grid = document.getElementById('catalog');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    cards.forEach(function (card) {
      var cat = card.getAttribute('data-cat') || '';
      card.style.display = (activeFilter === 'all' || cat === activeFilter) ? '' : 'none';
    });
    var sort = sortSel ? sortSel.value : 'popular';
    if (sort === 'price-asc' || sort === 'price-desc') {
      var sorted = cards.slice().sort(function (a, b) {
        var pa = parseFloat(a.getAttribute('data-price')) || 0;
        var pb = parseFloat(b.getAttribute('data-price')) || 0;
        return sort === 'price-asc' ? pa - pb : pb - pa;
      });
      sorted.forEach(function (card) { grid.appendChild(card); });
    }
    var q = searchForm ? (searchForm.querySelector('input').value || '') : '';
    if (q) applySearch(q);
  }

  /* --- Поиск из URL (?q=) --- */
  var qParam = new URLSearchParams(location.search).get('q');
  if (qParam && searchForm) {
    var si = searchForm.querySelector('input');
    si.value = qParam;
    applySearch(qParam);
  }

  /* --- Товар: количество --- */
  var qtyInput = document.getElementById('qty');
  if (qtyInput) {
    var minus = document.getElementById('qty-minus');
    var plus = document.getElementById('qty-plus');
    function setQty(v) {
      v = Math.max(1, Math.min(99, v));
      qtyInput.value = v;
    }
    if (minus) minus.addEventListener('click', function () { setQty(parseInt(qtyInput.value, 10) - 1); });
    if (plus) plus.addEventListener('click', function () { setQty(parseInt(qtyInput.value, 10) + 1); });
  }

  /* --- Товар: добавить в корзину (заглушка) --- */
  var addCart = document.getElementById('add-cart');
  if (addCart) {
    addCart.addEventListener('click', function () {
      toast(T('not_available'));
      var b = addCart;
      b.style.transform = 'scale(1.06)';
      setTimeout(function () { b.style.transform = ''; }, 120);
    });
  }

  /* --- Контакты: форма (заглушка) --- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = document.getElementById('form-status');
      if (s) s.classList.add('show');
    });
  }

  /* --- Язык: обновление товара на странице товара --- */
  var pid = new URLSearchParams(location.search).get('p') || 'moon';
  var sizeLabel = document.getElementById('size-label');
  var sizeRow = document.getElementById('size-row');
  var xxlNote = document.getElementById('xxl-note');

  function paintExtras() {
    if (!sizeLabel || !sizeRow) return;
    var mug = pid === 'mug';
    if (mug) {
      sizeLabel.textContent = T('volume_label');
      sizeRow.innerHTML = '<span class="size">350 мл</span>';
      if (xxlNote) xxlNote.style.display = 'none';
    } else {
      sizeLabel.textContent = T('size_label');
      sizeRow.innerHTML = '<span class="size">S</span><span class="size">M</span><span class="size">L</span><span class="size">XL</span><span class="size dim">XXL</span>';
      if (xxlNote) { xxlNote.style.display = ''; xxlNote.textContent = T('size_xxl'); }
    }
  }
  if (window.TQR_I18N && document.getElementById('product-name')) {
    function paintProduct() {
      var lang = TQR_I18N.detect();
      var item = TQR_I18N.product(lang, pid);
      document.title = item.name + ' — The Quiet Room';
      document.getElementById('crumb-name').textContent = item.name;
      document.getElementById('product-name').textContent = item.name;
      document.getElementById('product-tag').textContent = item.tag;
      document.getElementById('product-desc').textContent = item.desc;
      paintExtras();
    }
    document.addEventListener('tqr:lang', paintProduct);
    paintProduct();
  }
  paintExtras();

  /* --- Список товаров для JS (цены/картинки, не переводятся) --- */
  window.TQR_CATALOG = {
    moon:  { img: 'assets/img/tee-cream.svg',   alt: 'Кремова футболка з принтом-півмісяцем', price: '24,90', dark: false, cat: 'clothes' },
    arch:  { img: 'assets/img/tee-white.svg',   alt: 'Біла футболка з принтом-аркою',         price: '24,90', dark: false, cat: 'clothes' },
    night: { img: 'assets/img/hoodie-dark.svg', alt: 'Темне худі з принтом «тиха кімната»',   price: '39,90', dark: true,  cat: 'clothes' },
    mug:   { img: 'assets/img/mug.svg',         alt: 'Кухоль з принтом-півмісяцем',           price: '16,90', dark: false, cat: 'home' }
  };

  /* --- Product: подстановка картинок/цен/категорий из TQR_CATALOG --- */
  var media = document.getElementById('product-media');
  var pimg = document.getElementById('product-img');
  if (media && pimg && window.TQR_CATALOG[pid]) {
    var def = window.TQR_CATALOG[pid];
    pimg.src = def.img;
    pimg.alt = def.alt;
    media.classList.toggle('dark', def.dark);
    var priceEl = document.getElementById('product-price');
    if (priceEl && priceEl.getAttribute('data-i18n') === null) priceEl.textContent = '€' + def.price;
  }
  var priceStatic = document.getElementById('product-price');
  if (priceStatic && priceStatic.getAttribute('data-static') === '1') {
    priceStatic.textContent = '€' + (window.TQR_CATALOG[pid] ? window.TQR_CATALOG[pid].price : '24,90');
  }
})();