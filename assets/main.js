/* The Quiet Room — інтеракції v7: конфіг-адмінка (config.json), паралакс, reveal, tilt, пошук, мови */
(function () {
  'use strict';

  /* ================= КОНФІГ З АДМІНКИ (config.json) =================
     Note: innerHTML нижче будує картки з config.json — це довірений файл
     власника сайту (редагується через адмінку), не користувацький ввід. */
  var CFG = {
    "site": { "brand": "The Quiet Room", "logo": "", "banner_uk": "Перші принти вже в продажу на BlackSea", "banner_en": "First prints are now live on BlackSea" },
    "colors": { "wine": "#8E2137", "wine_deep": "#400D18", "cream": "#F6EFE0", "gold": "#C9A24A" },
    "fonts": { "pair": "bebas" },
    "social": { "instagram": "", "tiktok": "", "facebook": "", "telegram": "" },
    "products": [
      { "id": "crescent", "cat": "clothes", "img": "assets/img/tee-cream.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Півмісяць", "name_en": "Crescent", "tag_uk": "Футболка · Бавовна", "tag_en": "T-Shirt · Cotton", "desc_uk": "Місяць і зірка на грудях — для тих, хто любить тишу. Файл для друку.", "desc_en": "Moon and star on the chest — for those who love stillness. Print file.", "hide": false },
      { "id": "arch", "cat": "clothes", "img": "assets/img/tee-white.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Арка", "name_en": "Arch", "tag_uk": "Футболка · Бавовна", "tag_en": "T-Shirt · Cotton", "desc_uk": "Дверний отвір зі світлом на порозі — запрошення всередину. Файл для друку.", "desc_en": "A doorway with light on the threshold — an invitation inside. Print file.", "hide": false },
      { "id": "night", "cat": "clothes", "img": "assets/img/hoodie-dark.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Нічник", "name_en": "Nightlight", "tag_uk": "Худі · Фліс", "tag_en": "Hoodie · Fleece", "desc_uk": "Повний знак тихої кімнати — арка, півмісяць, зірка і світло. Файл для друку.", "desc_en": "The full quiet-room sign — arch, crescent, star and light. Print file.", "hide": false },
      { "id": "moon", "cat": "home", "img": "assets/img/mug.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Місяць", "name_en": "Moon", "tag_uk": "Кухоль · Кераміка", "tag_en": "Mug · Ceramic", "desc_uk": "Ранок починається з тиші: півмісяць і зірка. Файл для друку.", "desc_en": "Mornings start with stillness: a crescent and a star. Print file.", "hide": false }
    ]
  };

  var FONT_PAIRS = {
    bebas: { display: "'Bebas Neue'", displayCyr: "'Oswald'", body: "'Space Grotesk'", bodyCyr: "'Manrope'", script: "'Great Vibes'", link: "family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Great+Vibes" },
    oswald: { display: "'Oswald'", displayCyr: "'Oswald'", body: "'Manrope'", bodyCyr: "'Manrope'", script: "'Great Vibes'", link: "family=Oswald:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Great+Vibes" },
    russo: { display: "'Russo One'", displayCyr: "'Russo One'", body: "'Inter'", bodyCyr: "'Inter'", script: "'Great Vibes'", link: "family=Russo+One&family=Inter:wght@400;500;600;700&family=Great+Vibes" }
  };

  /* ---- Завантаження config.json (фолбек на вбудований CFG) ---- */
  fetch('config.json?v=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    if (cfg && cfg.products) CFG = cfg;
    applyConfig();
  }).catch(function () { applyConfig(); });

  function lang() {
    return window.TQR_I18N ? TQR_I18N.detect() : 'uk';
  }

  function applyConfig() {
    var root = document.documentElement.style;
    if (CFG.colors) {
      if (CFG.colors.wine) root.setProperty('--wine', CFG.colors.wine);
      if (CFG.colors.wine_deep) root.setProperty('--wine-deep', CFG.colors.wine_deep);
      if (CFG.colors.cream) root.setProperty('--cream', CFG.colors.cream);
      if (CFG.colors.gold) root.setProperty('--gold', CFG.colors.gold);
    }
    if (CFG.fonts && FONT_PAIRS[CFG.fonts.pair]) {
      var f = FONT_PAIRS[CFG.fonts.pair];
      root.setProperty('--font-display', f.display + ', ' + f.displayCyr + ', "Arial Narrow", sans-serif');
      root.setProperty('--font-body', f.body + ', ' + f.bodyCyr + ', "Segoe UI", sans-serif');
      root.setProperty('--font-script', f.script + ', cursive');
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?' + f.link + '&display=swap';
      document.head.appendChild(link);
    }
    applyBrand();
    renderCatalog();
    renderSocial();
    applyBanner();
  }

  /* ---- Логотип і назва бренду ---- */
  function applyBrand() {
    if (!CFG.site) return;
    if (CFG.site.brand) {
      document.querySelectorAll('.brand-script').forEach(function (el) { el.textContent = CFG.site.brand; });
      document.querySelectorAll('.footer-brand').forEach(function (el) { el.textContent = CFG.site.brand; });
      if (document.title.indexOf('The Quiet Room') !== -1) document.title = CFG.site.brand;
    }
    if (CFG.site.logo) {
      document.querySelectorAll('.brand-mark').forEach(function (svg) {
        var img = document.createElement('img');
        img.className = 'brand-logo';
        img.src = CFG.site.logo;
        img.alt = CFG.site.brand || 'The Quiet Room';
        svg.parentNode.replaceChild(img, svg);
      });
    }
  }

  /* ---- Каталог з конфігу ---- */
  function renderCatalog() {
    var grid = document.getElementById('catalog');
    if (!grid || !CFG.products) return;
    var L = lang();
    var out = '';
    CFG.products.forEach(function (p, i) {
      if (p.hide) return;
      var n = String(i + 1); if (n.length < 2) n = '0' + n;
      var dark = p.img.indexOf('hoodie') !== -1 ? ' dark' : '';
      var catName = L === 'uk' ? p.cat_uk || 'Одяг та дім' : p.cat_en || 'Clothes & home';
      var name = L === 'uk' ? p.name_uk : p.name_en;
      var tag = L === 'uk' ? p.tag_uk : p.tag_en;
      var desc = L === 'uk' ? p.desc_uk : p.desc_en;
      out += '<a class="card reveal" data-delay="' + (i % 4) + '" href="' + p.link + '" target="_blank" rel="noopener" data-name="' + (p.name_uk + ' ' + p.name_en) + '" data-desc="' + (p.desc_uk + ' ' + p.desc_en) + '" data-cat="' + (p.cat || '') + '">'
        + '<div class="card-media' + dark + '">'
        + '<span class="card-num">' + n + '</span>'
        + '<img loading="lazy" src="' + p.img + '" alt="' + name + ' — принт The Quiet Room" width="400" height="500">'
        + '<span class="card-badge"></span>'
        + '<span class="card-files">' + p.price + ' ₴</span>'
        + '</div><div class="card-body">'
        + '<p class="card-tag">' + tag + '</p>'
        + '<h3 class="card-title">' + name + '</h3>'
        + '<p class="card-desc">' + desc + '</p>'
        + '<div class="card-foot">'
        + '<span class="card-price"><span class="cur">₴</span>' + p.price + '</span>'
        + '<span class="btn-buy"></span>'
        + '</div></div></a>';
    });
    grid.innerHTML = out;
    /* Підписи, що залежать від мови */
    document.querySelectorAll('#catalog .card-badge').forEach(function (b) { b.textContent = t('on_sale'); });
    document.querySelectorAll('#catalog .btn-buy').forEach(function (b) { b.textContent = t('buy_on'); });
    document.querySelectorAll('#catalog .reveal').forEach(function (el) { if (window.__ioHas) el.classList.add('in'); });
    bindTilt();
    // пере-фільтри пошуку, якщо був запит
    var qp = new URLSearchParams(location.search).get('q');
    if (qp) applySearch(qp);
  }

  function t(key) {
    return window.TQR_I18N ? TQR_I18N.t(lang(), key) : key;
  }

  /* ---- Соцмережі ---- */
  var SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 3c.3 2 1.6 3.5 3.5 3.8v2.7c-1.3 0-2.5-.4-3.5-1.1v6.1c0 3-2.2 5-4.9 5C7.2 19.5 5 17.7 5 14.8c0-2.9 2.4-4.9 5.2-4.6v2.8c-1.3-.3-2.4.5-2.4 1.7 0 1.2.9 2 2.1 2 1.3 0 2.3-1 2.3-2.6V3h2.3z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.2c0-.8.3-1.4 1.5-1.4h1.4V5.2c-.3 0-1.2-.1-2.1-.1-2 0-3.3 1.2-3.3 3.4v2.6H8.4V14h2.6v7h2.5z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 4.3L2.8 11.4c-.9.4-.8 1.7.1 2l4.3 1.5 1.6 5.1c.3.9 1.4 1.1 2.1.5l2.4-2.1 4.3 3.2c.7.5 1.7.2 1.9-.7l2.9-15.2c.2-1.1-.8-2-1.9-1.4zM8.9 14.4l9.4-6.9c.2-.1.4.2.2.3l-7.7 7.4-.3 3-1.6-3.8z"/></svg>'
  };
  function renderSocial() {
    var boxes = document.querySelectorAll('.social-links');
    if (!boxes.length || !CFG.social) return;
    var out = '';
    ['instagram', 'tiktok', 'facebook', 'telegram'].forEach(function (k) {
      var url = CFG.social[k];
      if (!url) return;
      out += '<a class="social-link" href="' + url + '" target="_blank" rel="noopener" aria-label="' + k + '">' + (SOCIAL_ICONS[k] || '') + '</a>';
    });
    boxes.forEach(function (b) { b.innerHTML = out; b.classList.toggle('empty', !out); });
  }

  /* ---- Промо-смуга з конфігу ---- */
  function applyBanner() {
    if (!CFG.site) return;
    var txt = lang() === 'uk' ? CFG.site.banner_uk : CFG.site.banner_en;
    var promo = document.querySelector('.promo a');
    if (promo && txt) promo.textContent = txt;
  }

  document.addEventListener('tqr:lang', function () {
    if (document.querySelector('#catalog .card')) renderCatalog();
    applyBanner();
  });

  /* ================= СПАДКОВІ ІНТЕРАКЦІЇ ================= */

  /* --- Мова --- */
  if (window.TQR_I18N) TQR_I18N.init();

  /* --- Мобільне меню --- */
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

  /* --- Пошук --- */
  var searchForm = document.getElementById('search-form');
  function applySearch(q) {
    var cards = document.querySelectorAll('#catalog .card');
    var ql = (q || '').toLowerCase();
    var any = false;
    cards.forEach(function (card) {
      var hay = (card.getAttribute('data-name') || '').toLowerCase() + ' ' + (card.getAttribute('data-desc') || '').toLowerCase();
      var hit = !ql || hay.indexOf(ql) !== -1;
      card.style.display = hit ? '' : 'none';
      if (hit) any = true;
    });
    var empty = document.getElementById('search-empty');
    if (empty) empty.style.display = any ? 'none' : 'block';
  }
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (searchForm.querySelector('input').value || '').trim();
      if (/collection\.html/.test(location.pathname)) applySearch(q);
      else location.href = 'collection.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }
  var qParam = new URLSearchParams(location.search).get('q');
  if (qParam && searchForm) {
    searchForm.querySelector('input').value = qParam;
    applySearch(qParam);
  }

  /* --- Фільтри колекції --- */
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var f = chip.getAttribute('data-filter') || 'all';
      document.querySelectorAll('#catalog .card').forEach(function (card) {
        var cat = card.getAttribute('data-cat') || '';
        card.style.display = (f === 'all' || cat === f) ? '' : 'none';
      });
    });
  });

  /* --- Форма (заглушка) --- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = document.getElementById('form-status');
      if (s) s.classList.add('show');
    });
  }

  /* --- Reveal on scroll --- */
  var revealEls = document.querySelectorAll('.reveal');
  var __ioHas = false;
  if ('IntersectionObserver' in window) {
    __ioHas = true;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* --- Паралакс hero (тільки на пристроях з мишею) --- */
  var fine = window.matchMedia('(pointer: fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduced) {
    var heroBg = document.querySelector('.hero-bg');
    var heroMoon = document.querySelector('.hero-moon');
    var heroVisual = document.querySelector('.hero-visual');
    if (heroBg || heroMoon) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          var h = window.innerHeight;
          if (y < h * 1.15) {
            if (heroBg) heroBg.style.transform = 'translateY(' + y * 0.28 + 'px)';
            if (heroMoon) heroMoon.style.transform = 'translateY(' + y * 0.42 + 'px)';
          }
          if (heroVisual) heroVisual.style.transform = 'translateY(' + -y * 0.1 + 'px)';
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* --- Tilt карток (десктоп) --- */
  function bindTilt() {
    if (!(fine && !reduced)) return;
    document.querySelectorAll('#catalog .card').forEach(function (card) {
      if (card.__tilt) return;
      card.__tilt = true;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }
  bindTilt();

  /* --- Прогрес-бар прокрутки --- */
  var progress = document.getElementById('scroll-progress');
  if (progress) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Сжатие шапки --- */
  var header = document.querySelector('.site-header');
  if (header) {
    var hdrToggle = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', hdrToggle, { passive: true });
    hdrToggle();
  }

  /* --- Мобільна CTA --- */
  var mCta = document.getElementById('mobile-cta');
  if (mCta) {
    var ctaToggle = function () {
      var show = window.scrollY > 420;
      mCta.classList.toggle('hidden', !show);
      document.body.classList.toggle('cta-visible', show);
    };
    window.addEventListener('scroll', ctaToggle, { passive: true });
    ctaToggle();
  }

  /* --- Кастомний курсор (desktop, exact pointer) --- */
  if (fine && !reduced && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('has-cursor');

    var mx = -100, my = -100, rx = -100, ry = -100;
    var raf = null;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      if (!raf) {
        raf = requestAnimationFrame(function loop() {
          rx += (mx - rx) * 0.16;
          ry += (my - ry) * 0.16;
          ring.style.left = rx + 'px';
          ring.style.top = ry + 'px';
          raf = requestAnimationFrame(loop);
        });
      }
      var t = e.target;
      var hover = !!(t && (t.closest('a') || t.closest('button') || t.closest('.chip')));
      ring.classList.toggle('hover', hover);
      dot.classList.toggle('hover', hover);
    });
  }
})();