/* The Quiet Room — header scroll, search, filters, sorting, pagination, product page, newsletter */
(function () {
  'use strict';

  var PRODUCTS = window.TQR_PRODUCTS || [];
  var PER_PAGE = 8;
  var state = { q: '', cat: '', price: '', sort: 'featured', page: 1 };
  var CHECKOUT_URL = 'https://5307397047125.blacksea.in.ua/checkout';

  try {
    var oldCartStorage = window.localStorage;
    if (oldCartStorage && typeof oldCartStorage.removeItem === 'function') {
      oldCartStorage.removeItem('tqr-cart-v1');
      oldCartStorage.removeItem('tqr-cart-return-v1');
    }
  } catch (err) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
  }

  function money(n) {
    return '$' + Number(n).toFixed(2);
  }

  function productImages(p) {
    return (p.images && p.images.length) ? p.images : [p.img];
  }

  /* ---------- Swipe galleries ---------- */
  var SWIPE_MIN = 32;
  var SWIPE_RATIO = 1.2;

  function wrapIndex(index, length) {
    if (!length) return 0;
    return ((index % length) + length) % length;
  }

  function swipeDirection(dx, dy) {
    if (Math.abs(dx) < SWIPE_MIN) return 0;
    if (Math.abs(dx) <= Math.abs(dy) * SWIPE_RATIO) return 0;
    return dx < 0 ? 1 : -1;
  }

  function bindSwipe(el, onSwipe) {
    if (!el) return;
    var start = null;
    var suppressClickUntil = 0;

    el.addEventListener('pointerdown', function (e) {
      if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
      suppressClickUntil = 0;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, horizontal: false };
      if (el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }, { passive: true });

    el.addEventListener('pointermove', function (e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
        start.horizontal = true;
      } else if (Math.abs(dy) > Math.abs(dx) * SWIPE_RATIO) {
        start = null;
      }
    }, { passive: true });

    el.addEventListener('pointerup', function (e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      var horizontal = start.horizontal;
      start = null;
      var dir = horizontal ? swipeDirection(dx, dy) : 0;
      if (!dir) return;
      suppressClickUntil = Date.now() + 400;
      onSwipe(dir);
    });

    el.addEventListener('pointercancel', function () { start = null; });

    el.addEventListener('click', function (e) {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  function setCardIndex(media, index) {
    var slides = media.querySelectorAll('.card-slide');
    var dots = media.querySelectorAll('.card-dot');
    if (!slides.length) return;
    index = wrapIndex(index, slides.length);
    media.setAttribute('data-gallery-index', String(index));
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
  }

  function bindCardGalleries(root) {
    if (!root) return;
    root.querySelectorAll('.card-media').forEach(function (media) {
      var count = parseInt(media.getAttribute('data-gallery-count'), 10) || 1;
      if (count < 2) return;
      bindSwipe(media, function (dir) {
        var current = parseInt(media.getAttribute('data-gallery-index'), 10) || 0;
        setCardIndex(media, current + dir);
      });
    });
  }

  var pendingProductCardScroll = window.location.hash.indexOf('#product-card-') === 0;

  function cardReferrer(id) {
    var url = new URL(window.location.href);
    url.hash = 'product-card-' + encodeURIComponent(id);
    return url.href;
  }

  function buyURL(p, referrer) {
    var url = new URL(CHECKOUT_URL);
    url.searchParams.set('product', p.slug);
    url.searchParams.set('quantity', '1');
    url.searchParams.set('referrer', referrer);
    return url.href;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || (typeof e.button === 'number' && e.button !== 0) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target && e.target.closest ? e.target.closest('a[data-return-url]') : null;
    if (!link) return;
    var returnURL = link.getAttribute('data-return-url');
    if (!returnURL || !window.history || typeof window.history.replaceState !== 'function') return;
    try {
      var current = new URL(window.location.href);
      var target = new URL(returnURL, current);
      if (target.origin !== current.origin) return;
      window.history.replaceState(window.history.state, '', target.href);
    } catch (err) {}
  });


  var header = document.getElementById('site-header');
  var grid = document.getElementById('catalog');
  var pag = document.getElementById('pagination');
  var count = document.getElementById('count');

  /* ---------- Header: hides on scroll down, returns on scroll up ---------- */
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

  /* ---------- Slide-out panels ---------- */
  var burger = document.getElementById('burger');
  var menuDrawer = document.getElementById('menu-drawer');
  var menuOverlay = document.getElementById('menu-overlay');
  var menuClose = document.getElementById('menu-close');

  var filterDrawer = document.getElementById('filter-drawer');
  var filterOverlay = document.getElementById('filter-overlay');
  var filterClose = document.getElementById('filter-close');
  var filterOpenBtn = document.getElementById('filter-open');

  function syncBodyLock() {
    var open = (menuDrawer && menuDrawer.classList.contains('show')) ||
               (filterDrawer && filterDrawer.classList.contains('show'));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function setMenu(open) {
    if (!menuDrawer) return;
    menuDrawer.classList.toggle('show', open);
    if (menuOverlay) menuOverlay.classList.toggle('show', open);
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    syncBodyLock();
  }

  function setFilterPanel(open) {
    if (!filterDrawer) return;
    filterDrawer.classList.toggle('show', open);
    if (filterOverlay) filterOverlay.classList.toggle('show', open);
    if (filterOpenBtn) filterOpenBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    syncBodyLock();
  }

  if (burger) burger.addEventListener('click', function () { setMenu(true); });
  if (menuClose) menuClose.addEventListener('click', function () { setMenu(false); });
  if (menuOverlay) menuOverlay.addEventListener('click', function () { setMenu(false); });
  if (filterOpenBtn) filterOpenBtn.addEventListener('click', function () { setFilterPanel(true); });
  if (filterClose) filterClose.addEventListener('click', function () { setFilterPanel(false); });
  if (filterOverlay) filterOverlay.addEventListener('click', function () { setFilterPanel(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menuDrawer && menuDrawer.classList.contains('show')) setMenu(false);
    if (filterDrawer && filterDrawer.classList.contains('show')) setFilterPanel(false);
    if (sp && sp.classList.contains('open')) {
      sp.classList.remove('open');
      if (st) st.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- Search: the magnifier opens the field ---------- */
  var st = document.getElementById('search-toggle');
  var sp = document.getElementById('search-panel');
  var si = document.getElementById('search-input');

  function goToSearch() {
    var q = si ? si.value.trim() : '';
    if (!q) return;
    if (grid) {
      state.q = q.toLowerCase();
      state.page = 1;
      renderGrid();
      updateResetVisibility();
    } else {
      window.location.href = 'index.html?q=' + encodeURIComponent(q);
    }
  }

  if (st && sp) {
    st.addEventListener('click', function (e) {
      e.stopPropagation();
      sp.classList.toggle('open');
      st.setAttribute('aria-expanded', sp.classList.contains('open') ? 'true' : 'false');
      if (sp.classList.contains('open') && si) si.focus();
    });
    document.addEventListener('click', function (e) {
      if (sp.classList.contains('open') && !sp.contains(e.target) && !st.contains(e.target)) {
        sp.classList.remove('open');
        st.setAttribute('aria-expanded', 'false');
      }
    });
  }
  if (si) {
    si.addEventListener('input', function () {
      if (!grid) return;
      state.q = si.value.trim().toLowerCase();
      state.page = 1;
      renderGrid();
      updateResetVisibility();
    });
    si.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        goToSearch();
      }
    });
    si.addEventListener('change', function () {
      if (!grid) goToSearch();
    });
  }

  /* ---------- Filters and sorting ---------- */
  function syncSelects() {
    var pairs = { cat: ['f-cat'], price: ['f-price'], sort: ['f-sort', 'm-sort'] };
    Object.keys(pairs).forEach(function (key) {
      pairs[key].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.value !== state[key]) el.value = state[key];
      });
    });
    var rc = document.querySelector('input[name="p-cat"][value="' + state.cat + '"]');
    if (rc) rc.checked = true;
    var rp = document.querySelector('input[name="p-price"][value="' + state.price + '"]');
    if (rp) rp.checked = true;
  }
  function bindSelect(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      state[key] = el.value;
      state.page = 1;
      renderGrid();
      syncSelects();
      updateResetVisibility();
    });
  }
  bindSelect('f-cat', 'cat');
  bindSelect('f-price', 'price');
  bindSelect('f-sort', 'sort');
  bindSelect('m-sort', 'sort');

  /* Panel radios apply immediately; Apply closes the panel */
  ['p-cat', 'p-price'].forEach(function (name) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.addEventListener('change', function () {
        state[name === 'p-cat' ? 'cat' : 'price'] = r.value;
        state.page = 1;
        renderGrid();
        syncSelects();
        updateResetVisibility();
      });
    });
  });

  /* Accordions */
  document.querySelectorAll('.acc-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = document.getElementById(btn.getAttribute('data-acc')).parentElement;
      var open = group.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  var applyBtn = document.getElementById('m-apply');
  if (applyBtn) applyBtn.addEventListener('click', function () { setFilterPanel(false); });

  /* ---------- Reset all filters ---------- */
  function resetFilters() {
    state.q = '';
    state.cat = '';
    state.price = '';
    state.sort = 'featured';
    state.page = 1;
    if (si) si.value = '';
    syncSelects();
    renderGrid();
    updateResetVisibility();
  }
  var fReset = document.getElementById('f-reset');
  var mRemove = document.getElementById('m-remove');
  if (fReset) fReset.addEventListener('click', resetFilters);
  if (mRemove) mRemove.addEventListener('click', resetFilters);

  /* Reset is visible only when something can be reset */
  function updateResetVisibility() {
    var dirty = state.q || state.cat || state.price || (state.sort && state.sort !== 'featured');
    if (fReset) fReset.style.display = dirty ? '' : 'none';
    var fc = document.getElementById('f-live-count');
    if (fc) {
      var n = applyFilters().length;
      fc.textContent = n + (n === 1 ? ' result' : ' results');
    }
  }

  /* ---------- Filtering and sorting ---------- */
  function applyFilters() {
    var list = PRODUCTS.slice();
    if (state.q) list = list.filter(function (p) {
      return (p.name + ' ' + p.cat).toLowerCase().indexOf(state.q) !== -1;
    });
    if (state.cat) list = list.filter(function (p) { return p.cat === state.cat; });
    if (state.price === 'under2') list = list.filter(function (p) { return p.price < 2; });
    if (state.price === 'over2') list = list.filter(function (p) { return p.price >= 2; });
    switch (state.sort) {
      case 'az': list.sort(function (a, b) { return a.name.localeCompare(b.name, 'en'); }); break;
      case 'za': list.sort(function (a, b) { return b.name.localeCompare(a.name, 'en'); }); break;
      case 'lo': list.sort(function (a, b) { return a.price - b.price; }); break;
      case 'hi': list.sort(function (a, b) { return b.price - a.price; }); break;
      case 'new': list.sort(function (a, b) { return b.order - a.order; }); break;
      default: list.sort(function (a, b) { return a.order - b.order; });
    }
    return list;
  }

  /* ---------- Product card ---------- */
  function cardHTML(p, referrer) {
    var images = productImages(p);
    var slides = images.map(function (src, i) {
      return '<img class="card-slide' + (i === 0 ? ' is-active' : '') + '"'
        + ' loading="lazy" draggable="false" src="' + esc(src) + '"'
        + ' alt="' + esc(p.name) + ' — image ' + (i + 1) + ' of ' + images.length + '"'
        + ' width="500" height="625">';
    }).join('');
    var dots = images.length > 1
      ? '<span class="card-dots" aria-hidden="true">' + images.map(function (src, i) {
          return '<span class="card-dot' + (i === 0 ? ' is-active' : '') + '"></span>';
        }).join('') + '</span>'
      : '';
    return '<article class="card" id="product-card-' + esc(p.id) + '">'
      + '<a class="card-media" href="product.html?id=' + esc(p.id) + '"'
      + ' data-gallery-index="0" data-gallery-count="' + images.length + '">'
      + '<span class="card-badge">' + esc(p.cat) + '</span>'
      + '<span class="card-slides">' + slides + '</span>'
      + dots
      + '</a>'
      + '<div class="card-body">'
      + '<a class="card-title" href="product.html?id=' + esc(p.id) + '">' + esc(p.name) + '</a>'
      + '<div class="card-price-row">'
      + '<span class="price-sale">' + money(p.price) + '</span>'
      + '</div>'
      + '<div class="card-actions">'
      + '<a class="card-btn" href="' + esc(buyURL(p, referrer)) + '" data-return-url="' + esc(referrer) + '">Buy now</a>'
      + '</div>'
      + '</div></article>';
  }

  function productCardIdFromHash() {
    var hash = window.location.hash;
    if (hash.indexOf('#product-card-') !== 0) return '';
    var id = hash.slice('#product-card-'.length);
    try { id = decodeURIComponent(id); } catch (err) {}
    return id;
  }

  function scrollToProductCard() {
    if (!pendingProductCardScroll) return;
    pendingProductCardScroll = false;
    var id = productCardIdFromHash();
    if (!id) return;
    window.requestAnimationFrame(function () {
      var el = document.getElementById('product-card-' + id);
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    });
  }

  function selectCatalogPageForHash() {
    if (!grid) return;
    var id = productCardIdFromHash();
    if (!id) return;
    var list = applyFilters();
    var index = list.findIndex(function (p) { return p.id === id; });
    if (index >= 0) state.page = Math.floor(index / PER_PAGE) + 1;
  }

  /* ---------- Grid and pagination ---------- */
  function renderGrid() {
    if (!grid) return;
    var list = applyFilters();
    var totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PER_PAGE;
    var pageItems = list.slice(start, start + PER_PAGE);

    if (count) {
      var n = list.length;
      count.textContent = n + (n === 1 ? ' product' : ' products');
    }

    grid.innerHTML = pageItems.length
      ? pageItems.map(function (p) { return cardHTML(p, cardReferrer(p.id)); }).join('')
      : '<p class="empty-state">No prints match your search. Try a different search or reset the filters.</p>';

    bindCardGalleries(grid);

    if (pag) {
      var p = '';
      if (state.page > 1) {
        p += '<button type="button" data-p="' + (state.page - 1) + '" aria-label="Previous page">←</button>';
      }
      for (var i = 1; i <= totalPages; i++) {
        p += i === state.page
          ? '<span class="cur" aria-current="page">' + i + '</span>'
          : '<button type="button" data-p="' + i + '" aria-label="Page ' + i + '">' + i + '</button>';
      }
      if (state.page < totalPages) {
        p += '<button type="button" data-p="' + (state.page + 1) + '" aria-label="Next page">→</button>';
      }
      pag.innerHTML = p;
    }

    scrollToProductCard();
  }
  if (pag) {
    pag.addEventListener('click', function (e) {
      var a = e.target.closest('button[data-p]');
      if (!a) return;
      state.page = parseInt(a.getAttribute('data-p'), 10);
      renderGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Read more ---------- */
  var rm = document.getElementById('read-more');
  var hd = document.getElementById('head-desc');
  if (rm && hd) {
    if (hd.scrollHeight <= hd.clientHeight + 4) rm.style.display = 'none';
    rm.addEventListener('click', function () {
      var open = hd.classList.toggle('open');
      rm.textContent = open ? 'Show less ▲' : 'Read more ▼';
      rm.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Newsletter: no backend is connected, so never claim success ---------- */
  var sf = document.getElementById('sub-form');
  var sok = document.getElementById('sub-ok');
  if (sf) {
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('sub-email');
      if (!email || !email.value || email.value.indexOf('@') < 1 || !email.checkValidity()) return;
      if (sok) {
        sok.textContent = 'Newsletter signup isn’t connected yet — your email wasn’t sent anywhere.';
        sok.hidden = false;
      }
    });
  }

  /* ---------- Product page ---------- */
  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.setAttribute('content', value);
  }

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
      document.title = 'Print not found — The Quiet Room';
      page.innerHTML = '<p class="product-missing">Print not found. <a href="index.html">Back to the collection</a></p>';
      return;
    }

    var title = p.name + ' — The Quiet Room';
    var description = 'Digital print file “' + p.name + '” in PNG and PDF. Delivered instantly by email after purchase.';
    var images = productImages(p);
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', window.location.href);
    setMeta('meta[property="og:image"]', new URL(images[0], window.location.href).href);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    var related = PRODUCTS.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
    var thumbs = images.map(function (src, i) {
      return '<button type="button" class="product-thumb' + (i === 0 ? ' is-active' : '') + '"'
        + ' data-index="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '"'
        + ' aria-label="Show image ' + (i + 1) + ' of ' + images.length + '">'
        + '<img src="' + esc(src) + '" alt="' + esc(p.name) + ' — view ' + (i + 1) + '" width="160" height="160">'
        + '</button>';
    }).join('');
    page.innerHTML =
      '<div class="product-layout" id="product-card-' + esc(p.id) + '">'
      + '<div class="product-gallery">'
      + '<div class="product-media" data-gallery-index="0"><img id="product-main-image" draggable="false" src="' + esc(images[0]) + '" alt="' + esc(p.name) + ' — The Quiet Room print"></div>'
      + '<div class="product-thumbs" role="group" aria-label="Product images">' + thumbs + '</div>'
      + '</div>'
      + '<div class="product-info">'
      + '<p class="product-cat">' + esc(p.cat) + '</p>'
      + '<h1>' + esc(p.name) + '</h1>'
      + '<div class="product-price">'
      + '<span class="price-sale">' + money(p.price) + '</span>'
      + '</div>'
      + '<p class="product-formats">Formats: ' + esc(p.formats) + '</p>'
      + '<div class="product-desc">'
      + '<p>A digital print file of “' + esc(p.name) + '” in The Quiet Room’s signature style. It works beautifully on T-shirts, hoodies, mugs, posters and other products.</p>'
      + '<p>Buy once and print as often as you like. After payment, the file is delivered instantly to your inbox and saved in your BlackSea library.</p>'
      + '</div>'
      + '<ul class="product-feats">'
      + '<li><i class="fa-solid fa-circle-check"></i>Instant email delivery after payment</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>Ready to upload to Printify, Printful and Redbubble</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>For personal use and small businesses</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>Digital download — no physical item is shipped</li>'
      + '</ul>'
      + '<div class="product-buy-row">'
      + '<a class="product-buy" href="' + esc(buyURL(p, cardReferrer(p.id))) + '" data-return-url="' + esc(cardReferrer(p.id)) + '">Buy now — ' + money(p.price) + '</a>'
      + '</div>'
      + '<p class="product-safe"><i class="fa-solid fa-lock"></i> Secure card payment · 3-D Secure</p>'
      + '<p class="product-checkout-note">Checkout is hosted by BlackSea. You can add more prints to your BlackSea basket before paying.</p>'
      + '</div></div>'
      + '<section class="product-related"><h2>You may also like</h2><div class="grid">'
      + related.map(function (x) { return cardHTML(x, cardReferrer(x.id)); }).join('')
      + '</div></section>';

    var mainImage = document.getElementById('product-main-image');
    var media = page.querySelector('.product-media');
    var thumbButtons = page.querySelectorAll('.product-thumb');
    var current = 0;

    function showImage(index) {
      index = wrapIndex(index, images.length);
      current = index;
      if (mainImage && images[index]) mainImage.src = images[index];
      if (media) media.setAttribute('data-gallery-index', String(index));
      thumbButtons.forEach(function (b) {
        var active = parseInt(b.getAttribute('data-index'), 10) === index;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    thumbButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        showImage(parseInt(btn.getAttribute('data-index'), 10));
      });
    });
    if (media && images.length > 1) {
      bindSwipe(media, function (dir) { showImage(current + dir); });
    }
    bindCardGalleries(page);

    scrollToProductCard();
  }

  /* ---------- Start ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var initialQ = new URLSearchParams(window.location.search).get('q');
    if (initialQ && grid) {
      state.q = initialQ.trim().toLowerCase();
      if (si) si.value = initialQ.trim();
      if (sp) {
        sp.classList.add('open');
        if (st) st.setAttribute('aria-expanded', 'true');
      }
    }
    selectCatalogPageForHash();
    renderGrid();
    syncSelects();
    updateResetVisibility();
    renderProduct();
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  });
})();
